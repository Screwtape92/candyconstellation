// Server-side anti-cheat plausibility check (docs/game-design.md "Anti-cheat
// plausibility formula"):
//
//   maxPlausibleScore(elapsedSec) =
//     (survivalPointsPerSec * elapsedSec + maxCandyRatePerSec(elapsedSec) * elapsedSec)
//     * toleranceMultiplier
//   reject if score > maxPlausibleScore(elapsedSec) OR elapsedSec < minViableRunSec
//
// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE HAZARD — the constants below MIRROR frontend tuning values by hand.
// There is no code-sharing mechanism between the ESM frontend (src/) and this CJS
// api/ package, so these are duplicated. If a mirrored frontend constant changes
// and this file is not updated to match, the check silently desyncs — a real
// player's honest score could start getting rejected, or a cheated one accepted,
// with nothing failing loudly to signal it. Each constant cites its frontend
// source file + name; keep them in sync whenever that tuning is retuned.
// ─────────────────────────────────────────────────────────────────────────────

// Mirrors SURVIVAL_POINTS_PER_SEC in src/game/systems/ScoreSystem.ts.
const SURVIVAL_POINTS_PER_SEC = 2

// Mirrors src/game/data/spawnTable.ts: the three collectible rows carry weight
// 10 each (combined 30) within the full table's total weight of 138 (obstacles
// 100 + collectibles 30 + power-ups 8).
const COLLECTIBLE_WEIGHT = 30
const TOTAL_SPAWN_WEIGHT = 138

// Mirrors `value: 50` on every collectible row in src/game/data/spawnTable.ts.
const COLLECTIBLE_VALUE = 50

// Mirrors spawnBaseMs / spawnRampCoeff in src/game/systems/DifficultyCurve.ts,
// which feed spawnIntervalMs(t) = spawnBaseMs / (1 + spawnRampCoeff * sqrt(t)).
const SPAWN_BASE_MS = 800
const SPAWN_RAMP_COEFF = 0.25

// TUNABLE — playtest, not final (docs/game-design.md "Tunables appendix",
// "anti-cheat tolerance"). Slack above the theoretical max so a genuinely great
// run near the bound isn't rejected for rounding/measurement noise.
const TOLERANCE_MULTIPLIER = 1.15

// TUNABLE — playtest, not final (docs/game-design.md "Tunables appendix",
// "minimum viable run"). A run this short can't have produced a real score.
const MIN_VIABLE_RUN_SEC = 1

// Mirror of DifficultyCurve.spawnIntervalMs(t), expressed in seconds. The
// overall spawn cadence (all kinds combined) at elapsed time t.
function spawnIntervalSec(t: number): number {
  return SPAWN_BASE_MS / (1 + SPAWN_RAMP_COEFF * Math.sqrt(t)) / 1000
}

// A deliberately generous theoretical upper bound on candy points earned per
// second: the rate if EVERY spawn slot that could be candy were candy and were
// collected instantly. Real players can't approach this — that's intentional,
// the check only rejects clearly-implausible scores, not merely-lucky ones. It
// grows with the same sqrt(t) curve as the difficulty ramp (spawn interval
// shrinks over time, so the rate rises), so a long, skilled run isn't falsely
// rejected by a fixed ceiling that no longer exists in the difficulty design.
function maxCandyRatePerSec(t: number): number {
  const candyFraction = COLLECTIBLE_WEIGHT / TOTAL_SPAWN_WEIGHT
  return (candyFraction * COLLECTIBLE_VALUE) / spawnIntervalSec(t)
}

// Evaluating maxCandyRatePerSec at the run's final elapsedSec and multiplying by
// elapsedSec treats the run's peak (final) candy rate as if it held for the whole
// run. Since the rate only ever rises, that over-estimates total candy points —
// a generous bound, exactly what anti-cheat wants (favour false-accept over
// false-reject of honest players).
export function maxPlausibleScore(elapsedSec: number): number {
  return (
    (SURVIVAL_POINTS_PER_SEC * elapsedSec +
      maxCandyRatePerSec(elapsedSec) * elapsedSec) *
    TOLERANCE_MULTIPLIER
  )
}

export function isPlausibleScore(score: number, elapsedSec: number): boolean {
  if (elapsedSec < MIN_VIABLE_RUN_SEC) {
    return false
  }
  return score <= maxPlausibleScore(elapsedSec)
}
