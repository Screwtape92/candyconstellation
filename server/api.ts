import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateSubmission } from '../api/shared/inputValidation.js'
import { isPlausibleScore } from '../api/shared/antiCheat.js'
import { incrementAndCheckRateLimit } from './rateLimit.js'
import { insertScore, topScores } from './scores.js'

// Same two endpoints as api/submitScore and api/getLeaderboard, same
// validation/anti-cheat/rate-limit rules (imported directly from
// api/shared — those modules are storage-agnostic), rewired onto SQLite
// instead of Table Storage. See docs/architecture.md "Self-hosted
// deployment (home box + ngrok)".

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(payload)
}

export async function handleSubmitScore(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let body: unknown
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { error: 'Request body must be valid JSON.' })
    return
  }

  const validation = validateSubmission(body)
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.error })
    return
  }
  const { name, score, elapsedSec, submissionGuid } = validation.value

  // Per-IP rate limit: increment the caller's bucket and reject before the
  // anti-cheat check or the scores write — the increment happens regardless
  // of the outcome, so a script hammering at the threshold can't dodge being
  // counted by triggering a downstream reject.
  const rateLimit = incrementAndCheckRateLimit(req)
  if (rateLimit.limited) {
    sendJson(res, 429, {
      error: 'Too many submissions. Please wait a few minutes and retry.',
    })
    return
  }

  if (!isPlausibleScore(score, elapsedSec)) {
    sendJson(res, 422, {
      error: 'Score is not plausible for the reported run length.',
    })
    return
  }

  try {
    const result = insertScore({ name, score, elapsedSec, submissionGuid })
    if (result.duplicate) {
      sendJson(res, 200, { ok: true, duplicate: true })
      return
    }
    sendJson(res, 201, { ok: true })
  } catch (err) {
    console.error('submitScore failed to persist row', err)
    sendJson(res, 500, { error: 'Failed to record score. Please retry.' })
  }
}

const DEFAULT_TOP = 20
const MAX_TOP = 100

function resolveTop(raw: string | null): number {
  if (raw === null) {
    return DEFAULT_TOP
  }
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_TOP
  }
  return Math.min(parsed, MAX_TOP)
}

export function handleGetLeaderboard(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const top = resolveTop(url.searchParams.get('top'))

  try {
    const entries = topScores(top)
    sendJson(res, 200, { entries })
  } catch (err) {
    console.error('getLeaderboard failed to read scores', err)
    sendJson(res, 500, { error: 'Failed to load leaderboard. Please retry.' })
  }
}
