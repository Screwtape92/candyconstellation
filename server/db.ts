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
`)
