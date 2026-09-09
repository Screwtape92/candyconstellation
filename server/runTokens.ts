import { randomUUID } from 'node:crypto'
import { db } from './db.js'
import { RUN_TOKEN_MAX_AGE_SEC } from '../api/shared/runToken.js'

// SQLite-backed storage for run tokens (docs/game-design.md "Run token
// verification"). Mirrors the shape of server/scores.ts's insert/lookup
// split — see that file for the same node:sqlite-is-synchronous rationale
// for why no explicit locking is needed here.

export interface IssuedRunToken {
  token: string
  issuedAtUtc: string
}

const insertStmt = db.prepare(
  'INSERT INTO run_tokens (token, issued_at_utc, consumed) VALUES (?, ?, 0)',
)
const lookupStmt = db.prepare(
  'SELECT issued_at_utc FROM run_tokens WHERE token = ?',
)
const consumeStmt = db.prepare(
  'UPDATE run_tokens SET consumed = 1 WHERE token = ? AND consumed = 0',
)
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
// submission — is rejected outright rather than silently re-validated.
export function consumeRunToken(token: string): { issuedAtUtc: string } | null {
  const row = lookupStmt.get(token) as { issued_at_utc: string } | undefined
  if (!row) {
    return null
  }
  const result = consumeStmt.run(token)
  if (result.changes !== 1) {
    return null // already consumed
  }
  return { issuedAtUtc: row.issued_at_utc }
}
