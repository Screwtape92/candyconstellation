import { randomUUID } from 'node:crypto'
import { db } from './db.js'
import { RUN_TOKEN_MAX_AGE_SEC } from '../api/shared/runToken.js'
import { isValidProgressReport } from '../api/shared/liveProgress.js'

// SQLite-backed storage for run tokens (docs/game-design.md "Run token
// verification" / "Live progress verification"). Mirrors the shape of
// server/scores.ts's insert/lookup split — see that file for the same
// node:sqlite-is-synchronous rationale for why no explicit locking is needed
// here.

export interface IssuedRunToken {
  token: string
  issuedAtUtc: string
}

export interface ConsumedRunToken {
  issuedAtUtc: string
  lastReportAtUtc: string | null
  lastCandyPoints: number
  lastKillPoints: number
}

interface TokenRow {
  issued_at_utc: string
  consumed: number
  last_report_at_utc: string | null
  last_candy_points: number
  last_kill_points: number
  flagged: number
}

const insertStmt = db.prepare(
  'INSERT INTO run_tokens (token, issued_at_utc, consumed) VALUES (?, ?, 0)',
)
const lookupStmt = db.prepare(
  `SELECT issued_at_utc, consumed, last_report_at_utc, last_candy_points, last_kill_points, flagged
     FROM run_tokens WHERE token = ?`,
)
const consumeStmt = db.prepare(
  'UPDATE run_tokens SET consumed = 1 WHERE token = ? AND consumed = 0',
)
const recordProgressStmt = db.prepare(
  `UPDATE run_tokens
      SET last_report_at_utc = ?, last_candy_points = ?, last_kill_points = ?
    WHERE token = ?`,
)
const flagStmt = db.prepare('UPDATE run_tokens SET flagged = 1 WHERE token = ?')
const cleanupStmt = db.prepare('DELETE FROM run_tokens WHERE issued_at_utc < ?')

// Opportunistic sweep of expired tokens on each issue rather than a scheduled
// job — this project has no background task runner, and issuance happens
// often enough (once per run) to keep the table bounded without one.
function cleanupExpired(now: Date): void {
  const cutoff = new Date(now.getTime() - RUN_TOKEN_MAX_AGE_SEC * 1000)
  cleanupStmt.run(cutoff.toISOString())
}

export function issueRunToken(): IssuedRunToken {
  const now = new Date()
  cleanupExpired(now)
  const token = randomUUID()
  const issuedAtUtc = now.toISOString()
  insertStmt.run(token, issuedAtUtc)
  return { token, issuedAtUtc }
}

// Single-use: the UPDATE only succeeds (changes === 1) the first time a given
// token is consumed, so replaying a token — reusing it for a second, distinct
// submission — is rejected outright rather than silently re-validated. A
// flagged token (docs/game-design.md "Live progress verification" —  set the
// moment any single progress report failed validation) is rejected here too,
// even though it may never have been formally "consumed".
export function consumeRunToken(token: string): ConsumedRunToken | null {
  const row = lookupStmt.get(token) as TokenRow | undefined
  if (!row || row.flagged) {
    return null
  }
  const result = consumeStmt.run(token)
  if (result.changes !== 1) {
    return null // already consumed
  }
  return {
    issuedAtUtc: row.issued_at_utc,
    lastReportAtUtc: row.last_report_at_utc,
    lastCandyPoints: row.last_candy_points,
    lastKillPoints: row.last_kill_points,
  }
}

export type RecordProgressResult = 'ok' | 'invalid'

// Validates and records one /api/reportProgress call against the token's own
// last checkpoint (docs/game-design.md "Live progress verification"). Any
// failure permanently flags the token — a token that once produced an
// implausible jump doesn't get another chance to look fine later, since the
// whole point is continuous, not just eventually-consistent, plausibility.
export function recordProgress(
  token: string,
  candyPoints: number,
  killPoints: number,
  now: Date = new Date(),
): RecordProgressResult {
  const row = lookupStmt.get(token) as TokenRow | undefined
  if (!row || row.consumed || row.flagged) {
    return 'invalid'
  }

  const issuedAtMs = Date.parse(row.issued_at_utc)
  const lastReportMs = row.last_report_at_utc
    ? Date.parse(row.last_report_at_utc)
    : issuedAtMs
  const elapsedSecSoFar = (now.getTime() - issuedAtMs) / 1000
  const gapSeconds = (now.getTime() - lastReportMs) / 1000

  const valid = isValidProgressReport(
    candyPoints,
    killPoints,
    row.last_report_at_utc
      ? { candyPoints: row.last_candy_points, killPoints: row.last_kill_points }
      : null,
    elapsedSecSoFar,
    gapSeconds,
  )

  if (!valid) {
    flagStmt.run(token)
    return 'invalid'
  }

  recordProgressStmt.run(now.toISOString(), candyPoints, killPoints, token)
  return 'ok'
}
