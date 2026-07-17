// The difficulty curve from docs/game-design.md "Difficulty curve". Two
// continuous ramps that increase forever at a decaying rate (sqrt(t), so the
// per-second increase shrinks as the run goes on but never flattens to zero),
// plus one discrete, capped tier gate used only for content gating.
//
// t is elapsed seconds since the current run started. Kept as small pure
// functions here (not inlined at the call sites) so the formulas live in one
// findable, tunable place.

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "spawn ramp rate"). Revised after the first Phase 4.3 playtest round (testers
// reported the game felt too easy and the ramp wasn't noticeable within a
// minute or two of play). The old values (base 900 / coeff 0.1) barely tightened
// spawn cadence over a session (~900ms→~510ms by t=60s). spawnBaseMs is lowered
// so the post-onboarding baseline density is a touch higher, and spawnRampCoeff
// is raised so the sqrt(t) ramp climbs perceptibly (~800ms→~270ms by t=60s).
const spawnBaseMs = 800
const spawnRampCoeff = 0.25

// TUNABLE — playtest, not final. Revised in the same Phase 4.3 pass for the same
// "too easy" feedback. speedBasePxPerSec keeps the gentle t=0 fall speed (220),
// which the onboarding window already protects; speedAccelCoeff is raised (12→30)
// so obstacle speed roughly doubles over the first minute (~220→~450 px/s by
// t=60s) instead of climbing only ~40%. Grows without bound — no ceiling.
const speedBasePxPerSec = 220
const speedAccelCoeff = 30

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "difficulty tier length"). The discrete content gate: capped at maxTier so
// no new content unlocks forever, unlike the two ramps above.
const tierDurationSec = 30
const maxTier = 3

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "opening-difficulty floor duration"). The onboarding window: for the first N
// seconds of every run, SpawnSystem restricts obstacle selection to the
// baseline, most-predictable obstacle(s) so a first-time non-gamer gets a
// gentle, teachable opening (docs/game-design.md "Feel & experience" →
// "Onboarding" / "Difficulty floor"). This is deliberately a SEPARATE mechanism
// from difficultyTier: that is a discrete, capped content-unlock gate, whereas
// this is a one-off gentle-start floor. They share a "first N seconds" shape
// but answer different questions, so they're kept distinct to avoid coupling
// onboarding to future content-gating work.
const onboardingDurationSec = 10

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

// True during the opening gentle-start window (see onboardingDurationSec).
export function isOnboarding(t: number): boolean {
  return t < onboardingDurationSec
}
