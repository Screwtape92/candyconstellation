// Verifies a submission's claimed elapsedSec against real server-observed
// time (docs/game-design.md "Run token verification", added 2026-09-09 after
// live-event abuse: a fabricated-but-realistic (score, elapsedSec) pair is
// indistinguishable from a genuine great run by the plausibility-ratio check
// in antiCheat.ts alone, since elapsedSec is otherwise pure self-reported
// client input with nothing tying it to a real play session).
//
// A token is issued (POST /api/startRun) the moment a run actually begins and
// stamped with the server's own clock; submitScore later requires that token
// and checks the claimed elapsedSec can't exceed how much real time has
// actually passed since it was issued. Storage-agnostic — each backend
// creates/looks up/consumes the token itself (api/shared/runTokenStore.ts for
// Table Storage, server/runTokens.ts for SQLite); this module only judges an
// (issuedAtUtc, now) pair once a token has already been looked up.

// Generous ceiling on how old a still-usable token can be — bounds both
// storage growth and how long a stale token stays replayable. A player
// lingering on the post-game name-entry screen, or the offline retry queue
// (docs/architecture.md "Score-submission resilience") waiting to recover
// connectivity, both fit comfortably inside this without being flagged.
export const RUN_TOKEN_MAX_AGE_SEC = 3600

// Small forward tolerance for the gap between the client measuring elapsedSec
// and the server receiving the request (network latency, event-loop
// scheduling). Only ever makes the check a couple of seconds *stricter*, not
// looser by anything that matters — not a security hole.
const CLOCK_SKEW_TOLERANCE_SEC = 2

// A real run's elapsedSec can never exceed the real wall-clock time elapsed
// since its token was issued — that's the entire point of this check. Note
// this is deliberately one-directional: elapsedSec being much *smaller* than
// the token's age is completely normal and expected (time spent on the
// post-game name-entry screen, or sitting in the retry queue), not suspicious.
export function isValidRunDuration(
  claimedElapsedSec: number,
  issuedAtUtc: string,
  now: Date = new Date(),
): boolean {
  const issuedAtMs = Date.parse(issuedAtUtc)
  if (!Number.isFinite(issuedAtMs)) {
    return false
  }
  const ageSec = (now.getTime() - issuedAtMs) / 1000
  if (ageSec < 0 || ageSec > RUN_TOKEN_MAX_AGE_SEC) {
    return false
  }
  return claimedElapsedSec <= ageSec + CLOCK_SKEW_TOLERANCE_SEC
}
