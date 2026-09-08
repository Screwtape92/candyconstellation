import { db } from './db.js'

export interface ScoreSubmission {
  name: string
  score: number
  elapsedSec: number
  submissionGuid: string
}

export interface LeaderboardEntry {
  playerName: string
  score: number
  elapsedSec: number
  achievedAtUtc: string
}

const insertStmt = db.prepare(
  `INSERT INTO scores
     (submission_guid, player_name, score, elapsed_sec, achieved_at_utc)
   VALUES (?, ?, ?, ?, ?)`,
)

// Retry safety (docs/architecture.md "Table Storage schema", same rule here):
// the client reuses submissionGuid across retries, so a retried insert of an
// already-succeeded submission collides on the same UNIQUE column. SQLite
// rejects that with a plain Error whose message names the constraint; treat
// it as success so the client's retry queue clears instead of retrying
// forever.
export function insertScore(submission: ScoreSubmission): {
  duplicate: boolean
} {
  try {
    insertStmt.run(
      submission.submissionGuid,
      submission.name,
      submission.score,
      submission.elapsedSec,
      new Date().toISOString(),
    )
    return { duplicate: false }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('UNIQUE constraint failed')
    ) {
      return { duplicate: true }
    }
    throw err
  }
}

const topScoresStmt = db.prepare(
  `SELECT player_name, score, elapsed_sec, achieved_at_utc
     FROM scores
    ORDER BY score DESC
    LIMIT ?`,
)

interface ScoreRow {
  player_name: string
  score: number
  elapsed_sec: number
  achieved_at_utc: string
}

export function topScores(top: number): LeaderboardEntry[] {
  const rows = topScoresStmt.all(top) as unknown as ScoreRow[]
  return rows.map((row) => ({
    playerName: row.player_name,
    score: row.score,
    elapsedSec: row.elapsed_sec,
    achievedAtUtc: row.achieved_at_utc,
  }))
}
