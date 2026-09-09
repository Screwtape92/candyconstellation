import type { IncomingMessage, ServerResponse } from 'node:http'
import { validateSubmission } from '../api/shared/inputValidation.js'
import { isPlausibleScore } from '../api/shared/antiCheat.js'
import { isValidRunDuration } from '../api/shared/runToken.js'
import {
  incrementAndCheckRateLimit,
  incrementAndCheckRunTokenRateLimit,
} from './rateLimit.js'
import { insertScore, topScores } from './scores.js'
import { consumeRunToken, issueRunToken } from './runTokens.js'

// Same two endpoints as api/submitScore and api/getLeaderboard, same
// validation/anti-cheat/rate-limit rules (imported directly from
// api/shared — those modules are storage-agnostic), rewired onto SQLite
// instead of Table Storage. See docs/architecture.md "Self-hosted
// deployment (home box + ngrok)".

// Generous over the real payload (name <=24 chars, a couple of numbers, a
// 36-char GUID — a few hundred bytes as JSON at most). Without a cap, a
// single POST with an arbitrarily large body gets buffered into memory in
// full before validation ever runs (JSON.parse needs the whole string) —
// an unauthenticated, one-request memory-exhaustion DoS. Added 2026-09-09.
const MAX_BODY_BYTES = 4096

class PayloadTooLargeError extends Error {}

// Destroying `req` the moment the cap is exceeded also kills `res` (same
// underlying socket), so the caller's 413 response never actually reaches
// the client — it just sees a broken connection instead of a clean error.
// So this only ever rejects; the caller writes the response first and only
// then closes the socket (see handleSubmitScore's catch below).
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length'])
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      reject(new PayloadTooLargeError('Request body too large.'))
      return
    }

    let body = ''
    let bytes = 0
    let rejected = false

    req.on('data', (chunk: Buffer) => {
      if (rejected) return
      bytes += chunk.length
      // Content-Length is attacker-supplied and can be absent (chunked
      // transfer) or understated, so this streaming check — not the one
      // above — is what actually bounds memory use.
      if (bytes > MAX_BODY_BYTES) {
        rejected = true
        reject(new PayloadTooLargeError('Request body too large.'))
        return
      }
      body += chunk.toString('utf8')
    })
    req.on('end', () => {
      if (!rejected) resolve(body)
    })
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
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: 'Request body too large.' })
      // Written after the response, not before (see readBody) — this stops
      // the rest of an oversized upload rather than leaving the connection
      // to keep receiving data nothing further will do anything with.
      res.socket?.destroy()
      return
    }
    sendJson(res, 400, { error: 'Request body must be valid JSON.' })
    return
  }

  const validation = validateSubmission(body)
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.error })
    return
  }
  const { name, score, elapsedSec, submissionGuid, runToken } =
    validation.value

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

  // Run-token verification (docs/game-design.md "Run token verification"):
  // consumeRunToken is single-use, so a missing/unknown/already-used token is
  // rejected here before isValidRunDuration even runs. Same rejection message
  // as the plausibility check below — both boil down to "this claimed run
  // isn't credible" and there's no benefit to an attacker in distinguishing
  // which specific check caught it.
  const consumed = consumeRunToken(runToken)
  if (!consumed || !isValidRunDuration(elapsedSec, consumed.issuedAtUtc)) {
    sendJson(res, 422, {
      error: 'Score is not plausible for the reported run length.',
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

// Issues a run token the moment a run actually starts (docs/game-design.md
// "Run token verification") — called by the client from PlayScene.create(),
// well before there's anything to submit. Its own, more generous rate limit
// (see run_token_rate_limits in db.ts) so replaying several runs in a row
// never gets throttled before any of them even reach submission.
export function handleStartRun(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const rateLimit = incrementAndCheckRunTokenRateLimit(req)
  if (rateLimit.limited) {
    sendJson(res, 429, {
      error: 'Too many run starts. Please wait a few minutes and retry.',
    })
    return
  }

  const issued = issueRunToken()
  sendJson(res, 201, issued)
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
