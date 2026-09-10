// Live progress verification (docs/game-design.md "Live progress
// verification", added 2026-09-09) — the strongest anti-cheat layer yet,
// closing what the earlier checks tonight (run-token, score decomposition)
// still couldn't: none of them require anything to happen *during* the run,
// only that a claim made *after* the fact holds up. A single end-of-run
// report can always be reverse-engineered from the public source (candy=50,
// kill=30/60/100, the plausibility formula) and submitted once, any time
// after a token's been sitting around — no different in kind whether a
// person or an AI assistant did the reverse-engineering.
//
// The fix: stop trusting a single final report. PlayScene now reports its
// cumulative candyPoints/killPoints every REPORT_INTERVAL_MS while a run is
// in progress (src/api-client/reportProgress.ts), and the server keeps its
// own running checkpoint per token (issued by /api/startRun). submitScore
// then requires the *final* claimed candyPoints/killPoints to match that
// server-side checkpoint exactly, checkpointed recently relative to the
// claimed run length — which forces whoever's submitting to have kept a live
// process reporting correctly-paced, plausible increments for the *entire*
// real duration, not just to have computed one number at the end.

import { maxCandyRatePerSec, maxKillRatePerSec } from './antiCheat'

// Generous relative to the client's own reporting cadence
// (REPORT_INTERVAL_MS in src/api-client/reportProgress.ts, 3000ms) — covers
// normal network jitter/a missed beat or two without flagging a real player,
// while still forcing reports to keep arriving throughout the run rather
// than only at the start and end (see the file-level comment above for why
// that gap specifically needs closing).
export const MAX_REPORT_GAP_SEC = 12

// Looser than antiCheat.ts's own TOLERANCE_MULTIPLIER (1.15) — this bounds a
// *short interval* rather than a whole run, and short intervals are exactly
// where a legitimate burst (Candy Magnet pulling in several candies at once,
// a lucky cluster of obstacles lined up for the blaster) reads as a spike
// relative to its own tiny window. Generous here costs nothing: the earlier
// checks (run-token, decomposition, whole-run plausibility ceiling) already
// bound the aggregate tightly; this only needs to catch a report claiming
// dramatically more progress than any short real interval could produce.
const DELTA_TOLERANCE_MULTIPLIER = 3

export interface ProgressCheckpoint {
  candyPoints: number
  killPoints: number
}

// Called on each incoming /api/reportProgress call. `previous` is the
// token's last recorded checkpoint (or null if this is the first report —
// baselined at zero, checked against the token's own issuedAtUtc as the
// starting point). `gapSeconds` is real server-observed time since that
// checkpoint (or since issuance, for the first report) — never client-
// supplied, so it can't be inflated to unlock a bigger allowed delta.
export function isValidProgressReport(
  candyPoints: number,
  killPoints: number,
  previous: ProgressCheckpoint | null,
  elapsedSecSoFar: number,
  gapSeconds: number,
): boolean {
  if (gapSeconds < 0 || gapSeconds > MAX_REPORT_GAP_SEC) {
    return false
  }

  const previousCandy = previous?.candyPoints ?? 0
  const previousKill = previous?.killPoints ?? 0
  if (candyPoints < previousCandy || killPoints < previousKill) {
    return false // progress can only ever move forward within a run
  }

  const deltaCandy = candyPoints - previousCandy
  const deltaKill = killPoints - previousKill
  const maxDeltaCandy =
    maxCandyRatePerSec(elapsedSecSoFar) * gapSeconds * DELTA_TOLERANCE_MULTIPLIER
  const maxDeltaKill =
    maxKillRatePerSec() * gapSeconds * DELTA_TOLERANCE_MULTIPLIER

  return deltaCandy <= maxDeltaCandy && deltaKill <= maxDeltaKill
}

// Called once at submitScore. The final claim must match the server's own
// last checkpoint exactly (not just be independently plausible — see
// scoreDecomposition.ts for that check), and that checkpoint must have
// landed close to when the run *claims* to have ended
// (issuedAtUtc + elapsedSec) — deliberately not close to "now": submission
// can be delayed arbitrarily by the post-game name-entry screen or the
// offline retry queue (docs/architecture.md "Score-submission resilience"),
// neither of which should ever make an honest, already-finished run look
// stale.
export function isFreshCheckpoint(
  lastReportAtUtc: string | null,
  issuedAtUtc: string,
  elapsedSec: number,
): boolean {
  const issuedAtMs = Date.parse(issuedAtUtc)
  const claimedEndMs = issuedAtMs + elapsedSec * 1000
  const lastReportMs = lastReportAtUtc ? Date.parse(lastReportAtUtc) : issuedAtMs
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(lastReportMs)) {
    return false
  }
  return Math.abs(claimedEndMs - lastReportMs) / 1000 <= MAX_REPORT_GAP_SEC
}
