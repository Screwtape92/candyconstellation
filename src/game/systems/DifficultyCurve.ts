// The difficulty curve from docs/game-design.md "Difficulty curve". Two
// continuous ramps that increase forever at a decaying rate (sqrt(t), so the
// per-second increase shrinks as the run goes on but never flattens to zero),
// plus one discrete, capped tier gate used only for content gating.
//
// t is elapsed seconds since the current run started. Kept as small pure
// functions here (not inlined at the call sites) so the formulas live in one
// findable, tunable place.

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "spawn ramp rate"). spawnBaseMs keeps the pre-curve fixed value (900) as its
// t=0 starting point, so the very start of a run feels like what shipped
// before the curve; spawnRampCoeff sets how fast the cadence tightens.
const spawnBaseMs = 900
const spawnRampCoeff = 0.1

// TUNABLE — playtest, not final. speedBasePxPerSec keeps the pre-curve fixed
// fall speed (220) as its t=0 value; speedAccelCoeff sets how fast obstacles
// speed up over the run. Grows without bound — no ceiling (per the doc).
const speedBasePxPerSec = 220
const speedAccelCoeff = 12

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "difficulty tier length"). The discrete content gate: capped at maxTier so
// no new content unlocks forever, unlike the two ramps above.
const tierDurationSec = 30
const maxTier = 3

// Shrinks without bound toward (never reaching) zero as t grows.
export function spawnIntervalMs(t: number): number {
  return spawnBaseMs / (1 + spawnRampCoeff * Math.sqrt(t))
}

// Grows without bound as t grows.
export function obstacleSpeed(t: number): number {
  return speedBasePxPerSec + speedAccelCoeff * Math.sqrt(t)
}

// Discrete, capped step used to gate spawn-table rows by their minTier.
export function difficultyTier(t: number): number {
  return Math.min(maxTier, Math.floor(t / tierDurationSec))
}
