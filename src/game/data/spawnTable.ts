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
}

// The 3 MVP obstacle rows (names approved 2026-07-15 — see docs/game-design.md
// "MVP content"). Collectible and power-up rows are added in later Phase 3
// tasks.
//
// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Per-row weight/damage/speedMultiplier are placeholder balance values:
//  - gummy-meteor is the common baseline.
//  - jawbreaker is the slower, higher-damage heavy (speedMultiplier < 1).
//  - sour-comet is the faster, rarer hazard (speedMultiplier > 1); its
//    "trailing hazard tail" is a sprite concern — baked into the loop frames
//    and covered by a taller hitbox at sprite-integration time (Phase 7, see
//    docs/asset-spec.md), not a runtime code path or data field here.
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
]
