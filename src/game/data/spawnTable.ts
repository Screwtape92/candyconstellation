// Generic weighted spawn table (see docs/game-design.md "Health, power-up, and
// spawn systems"). Adding content is adding rows here, never new systems code.
export interface SpawnEntry {
  id: string
  kind: 'obstacle' | 'collectible' | 'powerup'
  weight: number
  minTier: number
  spriteKey: string
  damage?: number // obstacles
  value?: number // collectibles
  speedMultiplier?: number // optional per-entry override
  // Obstacles only: eligible during the opening onboarding window (see
  // docs/game-design.md "Onboarding"). During that window SpawnSystem restricts
  // obstacle selection to baseline, most-predictable rows flagged here, so a
  // first-time player gets a gentle, teachable start. Absent/false on the
  // harder variants; ignored for collectibles/power-ups (never a threat, never
  // restricted).
  onboardingSafe?: boolean
}

// The MVP obstacle + collectible + power-up rows (names approved 2026-07-15 —
// see docs/game-design.md "MVP content").
//
// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Per-row weight/damage/value/speedMultiplier are placeholder balance values:
//  - gummy-meteor is the common baseline.
//  - jawbreaker is the slower, higher-damage heavy (speedMultiplier < 1).
//  - sour-comet is the faster, rarer hazard (speedMultiplier > 1); its
//    "trailing hazard tail" is a sprite concern — baked into the loop frames
//    and covered by a taller hitbox at sprite-integration time (Phase 7, see
//    docs/asset-spec.md), not a runtime code path or data field here.
//  - the three collectibles (hop-nebula-dust, malt-meteorite, candy-star) are
//    undifferentiated candy-ingredient pickups per the MVP content table (no
//    rarity/value distinction is specified), so they share an equal weight and
//    value. Their combined weight (30) sits well below the obstacles' (100), so
//    candy is meaningfully present (~1 in 4 spawns) without turning a dodger
//    into a collect-a-thon. value feeds the scoring formula's
//    Σ(candyValue) term (docs/game-design.md "Scoring"), implemented in Phase
//    3.5. Collectibles carry no speedMultiplier, so they fall at the raw
//    obstacleSpeed(t) curve like a baseline obstacle — the docs give no reason
//    for candy to fall at a different rate.
//  - the two power-ups (candy-magnet, candy-heart) are a bonus, not a staple,
//    so each carries a low weight (4) — clearly rarer than any collectible
//    (10). Their combined weight (8) is ~6% of the total pool (138). Each row's
//    `id` matches a PowerUpDef in data/powerUps.ts, which is how a spawned
//    pickup looks up its effect. They carry no damage/value/speedMultiplier —
//    the effect is entirely defined by the PowerUpDef, and they fall at the raw
//    obstacleSpeed(t) curve like a baseline obstacle.
//
// minTier is 0 on every row, so all rows are spawnable from the start. The
// difficulty-tier gate (SpawnSystem + DifficultyCurve.difficultyTier) already
// filters selection by minTier; raising a row's minTier is how future content
// gets tier-gated — a data change, not a code change.
export const spawnTable: SpawnEntry[] = [
  {
    id: 'gummy-meteor',
    kind: 'obstacle',
    weight: 60,
    minTier: 0,
    spriteKey: 'gummy-meteor',
    damage: 1,
    onboardingSafe: true,
  },
  {
    id: 'jawbreaker',
    kind: 'obstacle',
    weight: 25,
    minTier: 0,
    spriteKey: 'jawbreaker',
    damage: 2,
    speedMultiplier: 0.6,
  },
  {
    id: 'sour-comet',
    kind: 'obstacle',
    weight: 15,
    minTier: 0,
    spriteKey: 'sour-comet',
    damage: 1,
    speedMultiplier: 1.4,
  },
  {
    id: 'hop-nebula-dust',
    kind: 'collectible',
    weight: 10,
    minTier: 0,
    spriteKey: 'hop-nebula-dust',
    value: 50,
  },
  {
    id: 'malt-meteorite',
    kind: 'collectible',
    weight: 10,
    minTier: 0,
    spriteKey: 'malt-meteorite',
    value: 50,
  },
  {
    id: 'candy-star',
    kind: 'collectible',
    weight: 10,
    minTier: 0,
    spriteKey: 'candy-star',
    value: 50,
  },
  {
    id: 'candy-magnet',
    kind: 'powerup',
    weight: 4,
    minTier: 0,
    spriteKey: 'candy-magnet',
  },
  {
    id: 'candy-heart',
    kind: 'powerup',
    weight: 4,
    minTier: 0,
    spriteKey: 'candy-heart',
  },
]
