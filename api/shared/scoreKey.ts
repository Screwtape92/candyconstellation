// RowKey encoding for the Scores table (docs/architecture.md "Table Storage
// schema"): RowKey = "{invertedScorePadded}_{submissionGuid}". Table Storage
// returns entities within a partition in ascending RowKey order, so inverting
// the score makes ascending key order == descending score order — getLeaderboard
// reads the top N straight off the head of the key range, no in-memory sort.

// Generous headroom over any plausible score. Survival earns only 2 pts/sec and
// the anti-cheat bound (see antiCheat.ts) keeps even a 24h run's max accepted
// score in the ~10^8 range, so a 10-digit offset is comfortably above anything
// that can pass validation. Scores >= SCORE_OFFSET are rejected in
// inputValidation so `SCORE_OFFSET - score` can never go negative (which would
// break the fixed-width padding and thus the sort order).
export const SCORE_OFFSET = 9_999_999_999
export const SCORE_DIGITS = 10

export function invertedScorePadded(score: number): string {
  return String(SCORE_OFFSET - score).padStart(SCORE_DIGITS, '0')
}

export function buildRowKey(score: number, submissionGuid: string): string {
  return `${invertedScorePadded(score)}_${submissionGuid}`
}
