import { SCORE_OFFSET } from './scoreKey'

// Server-side validation + sanitization of the anonymous, untrusted submitScore
// payload (docs/architecture.md "Input validation"). With no auth, every field
// is attacker-controlled: PlayerName is rendered back on a public leaderboard,
// score/elapsedSec feed the anti-cheat check, and submissionGuid becomes part of
// a Table Storage RowKey — so each is validated at this boundary.

// PlayerName cap. Long enough for a real name/handle, short enough to bound what
// gets stored and rendered on the leaderboard. The frontend input enforces the
// same limit, so a legitimate player never trips this; over-length here means a
// crafted request.
export const MAX_NAME_LENGTH = 24

// A run's reported duration can't plausibly exceed this. Without an upper bound,
// a crafted request could send a huge elapsedSec to inflate the anti-cheat
// plausibility ceiling arbitrarily. 24h is already far beyond any real run.
export const MAX_ELAPSED_SEC = 86_400

// Client-generated GUID, one per run, reused across retries. It becomes part of
// the RowKey, so it must be restricted to RowKey-safe characters — a strict UUID
// shape guarantees that (no '/', '\', '#', '?', or control chars).
const GUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export interface SubmissionInput {
  name: string
  score: number
  elapsedSec: number
  submissionGuid: string
}

export type ValidationResult =
  { ok: true; value: SubmissionInput } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// True for C0 controls (0x00-0x1F), DEL (0x7F), and C1 controls (0x80-0x9F).
function isControlChar(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f)
}

// Remove control characters, then trim. They carry no legitimate meaning in a
// display name and are a common injection/spoofing vector; visible markup is
// left intact here and encoded safely at render time on the leaderboard.
function sanitizeName(raw: string): string {
  let out = ''
  for (const ch of raw) {
    if (!isControlChar(ch.codePointAt(0) ?? 0)) {
      out += ch
    }
  }
  return out.trim()
}

export function validateSubmission(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return { ok: false, error: 'Request body must be a JSON object.' }
  }

  const { name, score, elapsedSec, submissionGuid } = body

  if (typeof name !== 'string') {
    return { ok: false, error: 'name is required and must be a string.' }
  }
  const cleanName = sanitizeName(name)
  if (cleanName.length === 0) {
    return { ok: false, error: 'name must not be empty.' }
  }
  if (cleanName.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `name must be at most ${MAX_NAME_LENGTH} characters.`,
    }
  }

  if (typeof score !== 'number' || !Number.isInteger(score)) {
    return { ok: false, error: 'score must be an integer.' }
  }
  if (score < 0 || score >= SCORE_OFFSET) {
    return {
      ok: false,
      error: `score must be between 0 and ${SCORE_OFFSET - 1}.`,
    }
  }

  if (typeof elapsedSec !== 'number' || !Number.isFinite(elapsedSec)) {
    return { ok: false, error: 'elapsedSec must be a finite number.' }
  }
  if (elapsedSec < 0 || elapsedSec > MAX_ELAPSED_SEC) {
    return {
      ok: false,
      error: `elapsedSec must be between 0 and ${MAX_ELAPSED_SEC}.`,
    }
  }

  if (
    typeof submissionGuid !== 'string' ||
    !GUID_PATTERN.test(submissionGuid)
  ) {
    return { ok: false, error: 'submissionGuid must be a valid GUID.' }
  }

  return {
    ok: true,
    value: {
      name: cleanName,
      score,
      elapsedSec,
      submissionGuid,
    },
  }
}
