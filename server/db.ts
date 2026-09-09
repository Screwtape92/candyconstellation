import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

// Self-hosted deployment's replacement for Azure Table Storage (see
// docs/architecture.md "Self-hosted deployment (home box + ngrok)"). One
// file, no external service, nothing to provision — the whole point of this
// path is that it runs on a home box with nothing but Node installed.
// `node:sqlite` is experimental in Node 22 but requires no native build step
// (unlike better-sqlite3), which matters more here than API stability: this
// project is a 3-day pre-event build, not a long-lived service.

// Compiled output lands at server/dist/server/db.js (tsc mirrors the source
// tree under server/dist — see server/tsconfig.json), so three levels up
// from there is the repo root.
const DATA_DIR = path.join(import.meta.dirname, '..', '..', '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'candy-constellation.db')

mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(DB_PATH)

// Schema mirrors the Scores/RateLimits tables' semantics, not their literal
// shape. SQLite can just ORDER BY score DESC, so none of the inverted-RowKey
// encoding scoreKey.ts needed for Table Storage applies here.
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_guid TEXT NOT NULL UNIQUE,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    elapsed_sec REAL NOT NULL,
    achieved_at_utc TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

  CREATE TABLE IF NOT EXISTS rate_limits (
    client_ip TEXT NOT NULL,
    bucket TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (client_ip, bucket)
  );

  -- Run-token verification (docs/game-design.md "Run token verification",
  -- added 2026-09-09): issued at real run start, consumed (single-use) at
  -- submission, so submitScore can check the claimed elapsedSec against real
  -- server-observed elapsed time instead of trusting it as pure client input.
  -- last_report_at_utc/last_candy_points/last_kill_points/flagged added
  -- 2026-09-09 (docs/game-design.md "Live progress verification"): the
  -- server's own running checkpoint of a run's progress, built up from
  -- periodic /api/reportProgress calls during play rather than trusted only
  -- from the final submitScore report. flagged is set the moment any single
  -- progress report fails validation (a too-large jump, a gap that's too
  -- long) and makes the token permanently unusable at submission, even if a
  -- later report on the same token would look fine in isolation.
  CREATE TABLE IF NOT EXISTS run_tokens (
    token TEXT PRIMARY KEY,
    issued_at_utc TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,
    last_report_at_utc TEXT,
    last_candy_points INTEGER NOT NULL DEFAULT 0,
    last_kill_points INTEGER NOT NULL DEFAULT 0,
    flagged INTEGER NOT NULL DEFAULT 0
  );

  -- Separate, more generous bucket from rate_limits above (which throttles
  -- submitScore) — a real player restarting several times in a row
  -- ("instant restart", docs/game-design.md "Feel & experience") needs a
  -- fresh token per attempt, well before any of those runs reach submission.
  CREATE TABLE IF NOT EXISTS run_token_rate_limits (
    client_ip TEXT NOT NULL,
    bucket TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (client_ip, bucket)
  );

  -- reportProgress's own bucket (docs/game-design.md "Live progress
  -- verification") — a single run reports every few seconds for its whole
  -- duration, far more frequently than run starts or submissions, so this
  -- needs its own, much more generous threshold.
  CREATE TABLE IF NOT EXISTS report_progress_rate_limits (
    client_ip TEXT NOT NULL,
    bucket TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (client_ip, bucket)
  );
`)

// Migration for the four run_tokens columns above: this project has no
// migration framework, and `run_tokens` already existed (without these
// columns) before tonight's live-progress feature, so CREATE TABLE IF NOT
// EXISTS above is a no-op against the real file on disk. SQLite has no
// `ADD COLUMN IF NOT EXISTS`, so each ALTER is just tried and its "duplicate
// column name" failure (a fresh database created with the columns already
// in the CREATE TABLE above) is swallowed rather than treated as an error.
for (const alter of [
  'ALTER TABLE run_tokens ADD COLUMN last_report_at_utc TEXT',
  'ALTER TABLE run_tokens ADD COLUMN last_candy_points INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE run_tokens ADD COLUMN last_kill_points INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE run_tokens ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0',
]) {
  try {
    db.exec(alter)
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('duplicate column')) {
      throw err
    }
  }
}
