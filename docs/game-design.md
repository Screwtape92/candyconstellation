# Game Design — Candy Constellation: Space Dodger

An endless vertical space-dodger: an astronaut auto-flies through a candy-asteroid
field, dodging obstacles and collecting candy ingredients to brew the beerfest
beer, with a health bar and power-ups rather than instant death on collision.

See `docs/planning-log.md` for the reasoning behind these decisions. This doc
is the current-state spec — update it whenever a design decision changes.

> **Content naming is not decided in this doc.** Obstacle/power-up/collectible
> names and theme are intentionally left as placeholders (see "MVP content"
> below) pending a follow-up conversation with the user. Do not invent or
> finalize names/lore here without asking first.

## Game state machine

Phaser scenes own everything inside an active run; the React shell owns
pre-game and post-game screens.

| Owner  | State            | Enters from                        | Exits to                                  |
|--------|------------------|-------------------------------------|--------------------------------------------|
| React  | Landing          | app load                            | Sign-in (or Guest name entry) → BootScene   |
| Phaser | BootScene        | Landing/Guest entry                 | PreloadScene (auto)                        |
| Phaser | PreloadScene     | BootScene                           | PlayScene (auto, once assets loaded)        |
| Phaser | PlayScene        | PreloadScene, PausedOverlay (resume)| PausedOverlay (pause input) or GameOverScene (health <= 0) |
| Phaser | PausedOverlay    | PlayScene (pause input)             | PlayScene (resume) or React Landing (quit)  |
| Phaser | GameOverScene    | PlayScene (health <= 0)             | React post-game screen                      |
| React  | Post-game        | GameOverScene                       | Score submission (fire-and-forget) → Leaderboard → Landing |

## Difficulty curve (ramp to a plateau, not unbounded)

Two independent ramps, each capped, plus a tier gate for content:

```
spawnIntervalMs(t) = max(spawnFloorMs, spawnBaseMs - spawnRampPerSec * t)   // TUNABLE — playtest, not final
obstacleSpeed(t)    = min(speedCapPxPerSec, speedBasePxPerSec + speedAccelPerSec * t)  // TUNABLE — playtest, not final

difficultyTier(t) = min(maxTier, floor(t / tierDurationSec))   // TUNABLE — playtest, not final
```

- `spawnIntervalMs` and `obstacleSpeed` ramp linearly then flatten — this is
  the moment-to-moment difficulty plateau.
- `difficultyTier` is a separate, discrete ceiling: spawn-table rows below
  are gated by `minTier`, and `difficultyTier` itself is capped at `maxTier`
  so no new content unlocks forever — the actual content ceiling, distinct
  from the speed/spawn-rate plateau.

## Health, power-up, and spawn systems (data-driven)

These are built generic from day one so that **expanding MVP content later is
adding data rows, not new systems code** — see "MVP content" below for how
thin the initial rows are.

**Health**
```
maxHealth: number                          // TUNABLE
onHit(obstacle): damage = obstacle.damage; briefly invulnerable for invulnMs  // TUNABLE
health <= 0 → GameOverScene
```

**Power-ups** — generic timed-effect shape:
```ts
interface PowerUpDef {
  id: string
  durationMs: number
  stacking: 'refresh' | 'ignore' | 'stack'
  onApply: (player) => void
  onExpire: (player) => void
}
```
MVP populates exactly **one** row of this table (see "MVP content").

**Spawn table** — generic weighted shape:
```ts
interface SpawnEntry {
  id: string
  kind: 'obstacle' | 'collectible' | 'powerup'
  weight: number
  minTier: number
  spriteKey: string
  damage?: number          // obstacles
  value?: number           // collectibles
  speedMultiplier?: number // optional per-entry override
}
```

## MVP content (placeholder — names TBD)

The MVP intentionally ships with a minimal table: **1-2 obstacle rows, 1
power-up row, 1 collectible row**. This is not a limitation of the system —
it's exactly the "start simple, but build the generic system first" tradeoff
from the planning log. Going from 1 power-up to 5, or 2 obstacles to 10, is
adding rows to `src/game/data/{spawnTable,powerUps}.ts` — no new systems code.

| id            | kind        | notes                                   |
|---------------|-------------|------------------------------------------|
| `obstacle-a`  | obstacle    | TBD — name/theme pending user input       |
| `obstacle-b`  | obstacle    | optional 2nd MVP obstacle, TBD            |
| `power-up-1`  | powerup     | TBD — effect + name pending user input    |
| `collectible-1`| collectible| the "candy ingredient" pickup, TBD name   |

## Scoring

```
score = survivalPointsPerSec * elapsedSec + Σ(candyValue for each pickup)   // constants TBD/tunable
```

Optional combo/streak multiplier left unspecified — decide during playtesting
if base scoring feels flat.

## Anti-cheat plausibility formula

Server-side check on score submission (see `docs/architecture.md` for where
this runs):

```
maxPlausibleScore(elapsedSec) =
  ( survivalPointsPerSec * elapsedSec + maxCandyRatePerSec * elapsedSec )
  * toleranceMultiplier                                  // e.g. 1.15, TUNABLE

reject submission if:
  score > maxPlausibleScore(elapsedSec)
  OR elapsedSec < minViableRunSec
```

`maxCandyRatePerSec` should be derived from the same spawn-table constants
used for the difficulty curve above, so the plausibility bound plateaus too
instead of growing unbounded over a long run. Exact constants are TBD —
tune once the spawn table and scoring constants are finalized.

## Audio spec

No audio assets exist yet; this is the track/cue list to source or generate
against:

- Music: one looping background track for `PlayScene`.
- SFX: candy pickup, obstacle hit, power-up activate, game over, UI click.
- Volume/mute preference persisted to `localStorage`, read by both the React
  shell (menu music) and Phaser (in-game SFX).

## Tunables appendix

All marked non-final — placeholder defaults only, to be set via playtesting:

| constant              | placeholder | notes                        |
|-----------------------|-------------|-------------------------------|
| ship acceleration     | TBD         | feel constant                  |
| ship drag             | TBD         | feel constant                  |
| spawn jitter range    | TBD         | avoids metronomic spawn timing |
| invulnerability window| TBD (ms)    | post-hit grace period          |
| power-up duration     | TBD (ms)    | per `PowerUpDef.durationMs`    |
| spawn ramp rate       | TBD         | see difficulty curve above     |
| difficulty tier length| TBD (sec)   | see difficulty curve above     |
| anti-cheat tolerance  | TBD (e.g. 1.15) | see anti-cheat formula above |
