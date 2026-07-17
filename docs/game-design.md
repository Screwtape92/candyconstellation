# Game Design — Candy Constellation: Space Dodger

An endless vertical space-dodger: an astronaut auto-flies through a candy-asteroid
field, dodging obstacles and collecting candy ingredients to brew the beerfest
beer, with a health bar and power-ups rather than instant death on collision.

See `docs/planning-log.md` for the reasoning behind these decisions. This doc
is the current-state spec — update it whenever a design decision changes.

> **MVP content naming is decided.** The 8 entities in the MVP content table
> below (3 obstacles, 2 power-ups, 3 collectibles) were named and approved by
> the user on 2026-07-15 — see "MVP content" below. Naming/theme for any
> *future* content beyond this MVP set is still undecided (including the
> Phase 3 stretch backlog noted below); do not invent or finalize names/lore
> for anything not already in that table without asking the user first.

## Game state machine

Phaser scenes own everything inside an active run; the React shell owns
pre-game and post-game screens.

| Owner  | State            | Enters from                        | Exits to                                  |
|--------|------------------|-------------------------------------|--------------------------------------------|
| React  | Landing          | app load                            | BootScene                                   |
| Phaser | BootScene        | Landing                             | PreloadScene (auto)                        |
| Phaser | PreloadScene     | BootScene                           | PlayScene (auto, once assets loaded)        |
| Phaser | PlayScene        | PreloadScene, PausedOverlay (resume)| PausedOverlay (pause input) or GameOverScene (health <= 0) |
| Phaser | PausedOverlay    | PlayScene (pause input)             | PlayScene (resume) or React Landing (quit)  |
| Phaser | GameOverScene    | PlayScene (health <= 0)             | React post-game screen                      |
| React  | Post-game (name entry + score submission) | GameOverScene | Name entry → score submission (fire-and-forget) → Leaderboard → Landing |

**Interim (Phase 2, 2026-07-17):** the React post-game screen and the
Phaser→React EventBus crossing are Phase 6 scope and don't exist yet, so
`GameOverScene` currently exits straight back into `PlayScene` on any
key/click for an instant fresh run, rather than to the React post-game
screen. This restart affordance also satisfies the "GameOver → next run must
be near-instant" requirement in "Feel & experience" below. The target exit
(`GameOverScene → React post-game`) in the table above is unchanged — the
restart is interim scaffolding to be superseded when Phase 6 wires up score
submission, not a design change to the state machine.

## Controls

Decided 2026-07-15. Keyboard only — no mouse input for gameplay movement.
Both arrow keys and WASD are bound to the same four-directional movement
actions, giving the player full 2D positioning freedom within the screen
bounds (not restricted to horizontal-only dodging, despite the vertical-
scroller framing). Supporting both key sets costs nothing extra since
they're just multiple key bindings mapped to the same movement actions, not
two separate control schemes to build or maintain.

| action     | keys              |
|------------|-------------------|
| move up    | Up arrow, `W`     |
| move down  | Down arrow, `S`   |
| move left  | Left arrow, `A`   |
| move right | Right arrow, `D`  |

Ship acceleration/drag feel constants live in the "Tunables appendix" below.

## Difficulty curve (continuously increasing, decaying rate, no hard cap)

Redesigned 2026-07-15: the previous version hard-capped both ramps at a
floor/ceiling, so a skilled player who reached the cap could then cruise
indefinitely at a fixed max difficulty forever. That's explicitly not
wanted — difficulty now increases without bound for the lifetime of a run
(every run eventually ends for any player, however skilled), but the *rate*
of increase decays over time so the early/mid-game ramp doesn't feel
punishing and doesn't itself accelerate forever — it just never fully
flattens either. A separate, discrete tier gate still exists for content:

```
spawnIntervalMs(t) = spawnBaseMs / (1 + spawnRampCoeff * sqrt(t))        // TUNABLE — playtest, not final
obstacleSpeed(t)    = speedBasePxPerSec + speedAccelCoeff * sqrt(t)       // TUNABLE — playtest, not final

difficultyTier(t) = min(maxTier, floor(t / tierDurationSec))   // TUNABLE — playtest, not final
```

- `obstacleSpeed` grows without bound as `t` grows — no `speedCapPxPerSec`
  ceiling anymore.
- `spawnIntervalMs` shrinks without bound, asymptotically approaching (but
  mathematically never reaching) zero — no `spawnFloorMs` constant anymore.
  There's no artificial floor value to tune; the curve's own shape keeps it
  positive.
- Both use `sqrt(t)` specifically because its derivative shrinks toward zero
  as `t` grows: the rate of change (how much harder each additional second
  makes things) diminishes over time even though the difficulty value itself
  never stops climbing. A logarithmic form would give the same
  increasing-forever/decaying-rate shape; `sqrt` is the current choice, not
  a locked-in one — pick whichever curve feels best in playtesting.
- This is a game-design ceiling removal only. Implementers should still
  expect a practical, engine-level minimum tick/spawn interval to exist
  somewhere (e.g. to avoid spawning many objects in a single frame at very
  high `t`) — that's a performance safeguard, not a designed difficulty cap,
  and shouldn't reintroduce a `spawnFloorMs`-style gameplay plateau.
- `difficultyTier` is unchanged from before: a separate, discrete ceiling
  for content gating — spawn-table rows are gated by `minTier`, and
  `difficultyTier` itself is capped at `maxTier` so no new content unlocks
  forever. This is about the fixed small MVP content set, not the
  moment-to-moment speed/spawn-rate ramps above, so it stays capped even
  though those no longer are.

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
MVP populates **two** rows of this table (see "MVP content"): "Candy Magnet"
and "Candy Heart" — these represent the two distinct effect shapes the
generic interface needs to support:

- **Candy Magnet** — a continuous timed effect. While active (`durationMs` >
  0), it pulls nearby collectibles toward the player. `onApply` sets a flag
  on the player and `onExpire` clears it; the per-frame pull itself is a
  small effect that checks that flag each tick and moves in-range
  collectibles toward the player (Phaser Arcade Physics has a built-in
  `moveToObject`-style helper suited to exactly this) — left as an
  implementation detail for whoever writes the code, not specified further
  here.
- **Candy Heart** — a one-time instant effect, not a timed one: on pickup,
  `onApply` immediately restores some amount of the player's current health,
  capped at `maxHealth`, and that's the entire effect — there's nothing
  ongoing to expire. It fits the existing `PowerUpDef` shape without needing
  a new interface field: use `durationMs: 0` and an `onExpire` that's a
  no-op (or simply absent/undefined, if the calling code treats a 0-duration
  power-up as never scheduling an expiry callback in the first place).
  `stacking` is moot for an instant effect — there's no active window to
  refresh/ignore/stack against — so its value doesn't materially matter for
  this row; pick whichever the spawn/pickup code finds simplest to special-
  case least (e.g. `'stack'`, since re-triggering `onApply` on repeat pickups
  is exactly the desired "restore more health" behavior with no extra
  handling required). This is a minor accommodation, not a shape change: the
  interface itself needs no new fields to support instant effects.

The health-restore amount itself is a new tunable (see "Tunables appendix"
below) — not yet assigned a placeholder value.

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
  onboardingSafe?: boolean // obstacles only: eligible during the onboarding window (see "Onboarding")
}
```

## MVP content

Names approved by the user 2026-07-15, with "Candy Heart" added as a second
power-up in a follow-up decision the same day. The MVP table has **3
obstacle rows, 2 power-up rows, and 3 collectible rows**. The collectible
count was deliberately expanded from the original 1-row minimal plan, at the user's
explicit choice, since the generic spawn table makes extra rows low-cost —
this is a settled scope increase, not a mistake to walk back. This is still
in keeping with the "start simple, but build the generic system first"
tradeoff from the planning log: growing this table further later is still
just adding rows to `src/game/data/{spawnTable,powerUps}.ts` — no new
systems code.

| id                | kind        | notes                                                        |
|-------------------|-------------|----------------------------------------------------------------|
| `gummy-meteor`    | obstacle    | standard obstacle                                               |
| `jawbreaker`      | obstacle    | bigger, slower, higher-damage variant                           |
| `sour-comet`      | obstacle    | trailing hazard tail — visually/behaviorally distinct from the round-asteroid obstacles above |
| `candy-magnet`    | powerup     | pulls nearby collectibles toward the player — see "Power-ups" above |
| `candy-heart`     | powerup     | instant, one-time health restore on pickup, capped at `maxHealth` — see "Power-ups" above |
| `hop-nebula-dust` | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |
| `malt-meteorite`  | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |
| `candy-star`      | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |

### Phase 3 stretch backlog (not committed MVP scope)

The following are recorded as future ideas only — **not** part of the MVP
table above, not scheduled, and not to be treated as settled scope. Listed
here so they aren't lost, and so nobody mistakes them for current content.

- **Black Hole** (obstacle idea, named by the user 2026-07-15): a
  gravity-well hazard that pulls the player's ship toward it while nearby.
  Explicitly bumped to Phase 3 stretch backlog rather than committed to MVP,
  after a discussion of its added complexity relative to the three MVP
  obstacles above. Unlike those, this is **not** a "just add a data row"
  item — flag this clearly whenever it's revisited:
  - It requires new code in the player-movement path (an active pull force
    on the ship), not passive collision-on-contact like every MVP obstacle.
  - It carries real tuning risk against the already-locked-in "difficulty
    floor for first-time players" requirement (see "Feel & experience"
    below) — an uncontrolled pull could read as unfair rather than
    challenging if mistuned.
  - It needs a more sophisticated particle/visual effect (a visible
    gravity-well distortion) than the simple sprite loop the MVP obstacles
    use.
- **2 additional power-ups**: unnamed and undesigned — noted only as "if
  there's time in Phase 3, consider adding 2 more power-up types." No
  mechanic, name, or theme decided; do not invent any until the user
  specifies them.

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
used for the difficulty curve above, using the same decaying-rate (`sqrt(t)`-
shaped) growth curve rather than a fixed constant. Updated 2026-07-15: since
the difficulty curve no longer plateaus (see "Difficulty curve" above), this
bound must not plateau either — it should keep growing over time too, just
at the same diminishing rate as the spawn/speed formulas, so a genuinely
skilled player's real score on a long run isn't falsely rejected as
implausible just because the check assumes a fixed ceiling that no longer
exists. Exact constants are TBD — tune once the spawn table and scoring
constants are finalized.

## Audio spec

No audio assets exist yet; this is the track/cue list to source or generate
against:

- Music: one looping background track for `PlayScene`.
- SFX: candy pickup, obstacle hit, power-up activate, game over, UI click.
- Volume/mute preference persisted to `localStorage`, read by both the React
  shell (menu music) and Phaser (in-game SFX).

## Feel & experience

The systems above make the game *work*. This section is about whether it
*feels good* and holds up in the actual context it'll be played in — raised
directly by the user, not carried over from the previous planning session.
Everything here is TBD/tunable like the rest of this doc, but each item needs
an explicit decision (even "explicitly deferred, not in MVP scope") rather
than being left for whoever writes the code to improvise.

**Game feel ("juice")**

Decided 2026-07-17 (Phase 4 kickoff):

| element | status | notes |
|---|---|---|
| hit-stop (brief freeze-frame on impact) | ✅ In MVP | duration TUNABLE, not final |
| screen shake on hit | ✅ In MVP, no toggle | intensity TUNABLE, not final. No motion-sensitivity toggle — this is a short-lived event hype piece, not a long-running product, so the extra scope/testing surface wasn't judged worth it. Revisit if playtesting surfaces real discomfort. |
| particle burst on pickup/hit | ✅ In MVP | must respect the particle caps in `docs/architecture.md`. Already implied by `docs/build-plan.md`'s Phase 4 "Juice" checklist bullet grouping this with hit-stop/screen shake as one package. |
| near-miss bonus (small score/visual reward for close dodges) | ❌ Deferred, not in MVP | a nice-to-have that adds scope (close-call detection logic) without being core to "does dodging feel good" — revisit post-MVP if there's time. |

**Onboarding (non-gamer audience, first-time visitors)**

Players are colleagues and other visitors opening the link cold, most likely
on their first attempt, with no assumed gaming literacy.

- The first ~10 seconds must teach the controls without a text tutorial
  screen. **Decided 2026-07-17**: a guaranteed-easy opening pattern — every
  run's first ~10 seconds spawns obstacles in a predictable, easy-to-dodge
  arrangement that naturally demonstrates movement, no text/overlay of any
  kind. This doubles as the difficulty-floor mechanism below (the opening
  window is inherently gentle by construction, not just by tuning the curve's
  constants).
- **Implemented 2026-07-17 (Phase 4.2):** during the onboarding window
  (`onboardingDurationSec`, 10s, in `DifficultyCurve.ts` — `isOnboarding(t)`)
  `SpawnSystem` restricts obstacle selection to baseline obstacle rows flagged
  `onboardingSafe` in the spawn table (currently just `gummy-meteor`, the
  standard/most-predictable obstacle), instead of the full weighted obstacle
  pool. So the opening spawns are the slower, simplest obstacle at random x —
  which still forces occasional left/right dodging — while the faster
  `sour-comet` and higher-damage `jawbreaker` are held back until the window
  elapses, after which the full weighted table resumes unchanged. Collectibles
  and power-ups are never a threat and are never restricted, throughout the
  whole run. This is intentionally not a fully hand-scripted sequence; it's a
  simple first version, expected to be revisited after the Phase 4.3 playtest
  with fresh colleagues. The mechanism is deliberately kept separate from
  `difficultyTier` (a discrete, capped content-unlock gate) even though both
  share a "first N seconds" shape — see the `DifficultyCurve.ts` comments.
  Which obstacles qualify is data (`onboardingSafe` on the row), so widening or
  narrowing the onboarding pool is a data edit, not a systems-code change.
- GameOver → next run must be near-instant (no asset reload, no multi-click
  menu) — so a player who wants another go isn't left waiting on the game
  itself.

**Cold-open first impression — no captive audience**

Corrected 2026-07-15: this is a standalone public web link anyone can open,
on their own computer, any time — there's no physical venue, no shared
station, and no line of people waiting with nothing else to do (see
`docs/planning-log.md`, "Platform: desktop web only" and the 2026-07-15
access-model correction). That removes the captive-audience effect a
physical event would have had, where a rough first 10 seconds gets forgiven
because there's a queue and nothing else to do while waiting. Here, a first
10 seconds that doesn't hook the player just costs a closed tab and no
return visit — no leaderboard entry, no second chance at the impression.
This raises the stakes on the onboarding item above rather than lowering
them.

- TBD: whether "hooked within ~10 seconds" should become an explicit
  acceptance bar for the onboarding controls-teaching mechanism above (e.g.
  tested against people who weren't told what to expect), rather than left
  as an unmeasured design intent.

**Difficulty floor for first-time players**

The ramp functions under "Difficulty curve" above are tunable, but
specifically: the opening difficulty must be gentle enough that a first-time
non-gamer survives long enough to feel good before it ramps — a floor
constraint on tuning, not just "start low somewhere." Exact values TBD via
playtesting.

**Implemented 2026-07-17 (Phase 4.2):** this floor is satisfied structurally
by the onboarding window described above (baseline-obstacle-only pool for the
first `onboardingDurationSec`), not merely by tuning the ramp constants low —
the gentle start is guaranteed by construction regardless of how the curve is
later tuned.

**Visual readability**

Obstacles, collectibles, and power-ups must stay visually distinguishable at a
glance even when the screen is busy at higher difficulty tiers (color-coding/
silhouette clarity) — a design constraint for `docs/asset-spec.md`, separate
from that doc's naming/pipeline conventions. Exact treatment TBD.

**Playtesting loop**

Every constant in the "Tunables appendix" below is marked "playtest, not
final." Approved plan 2026-07-15, tied to the phases in `docs/build-plan.md`:

| when | who | how | what it validates |
|---|---|---|---|
| End of Phase 2 (bare vertical slice) | the developer, or 1-2 close colleagues | informal gut-check only, not a formal round | dodging feels physically satisfying before investing further |
| End of Phase 4 (feel & experience pass) | 3-5 colleagues who haven't seen the game before | tested individually (not in a group), observed live without being helped/coached | onboarding ("hooked in 10 seconds, no tutorial") and the difficulty-floor requirement, both above |
| Phase 9 (final tuning before freeze) | 8-10+ people, across different gaming-familiarity levels | stress-test whatever tuning came out of the Phase 4 round | tuning holds up broadly, and many consecutive replays in a row still feels/works fine |
| Right before the 2026-09-11 freeze | the developer | final smoke-test on the actual frozen build | not a playtesting round — a last functional check, not a feedback pass |

Each round's feedback should turn into updated values in the "Tunables
appendix" below (and any doc text they support), not stay only in notes/chat
— the Phase 4 and Phase 9 rounds specifically exist to replace "TBD"
placeholders with real numbers.

**Replay hook**

TBD whether there's a deliberate "beat so-and-so's score" moment beyond the
leaderboard page itself.

## Tunables appendix

All marked non-final — placeholder defaults only, to be set via playtesting:

| constant              | placeholder | notes                        |
|-----------------------|-------------|-------------------------------|
| ship acceleration     | TBD         | feel constant                  |
| ship drag             | TBD         | feel constant                  |
| spawn jitter range    | TBD         | avoids metronomic spawn timing |
| survival points/sec   | 10 (points/sec) — TUNABLE, playtest, not final | survival term of the scoring formula (see "Scoring" above); a round arcade-feel default. Survival is the dominant term — candy (value 10 each, ~1 in 4 spawns) is a bonus on top, not the main score driver |
| max health            | TBD (health units) | starting/maximum player health, see "Health" above |
| invulnerability window| TBD (ms)    | post-hit grace period          |
| power-up duration     | 6000 (ms) — TUNABLE, playtest, not final | per `PowerUpDef.durationMs` (Candy Magnet only — Candy Heart is instant, `durationMs: 0`) |
| Candy Heart restore amount | 1 (health units) — TUNABLE, playtest, not final | amount restored on pickup, capped at `maxHealth` (currently 3); one unit is a meaningful but not full heal |
| spawn ramp rate       | TBD         | see difficulty curve above     |
| difficulty tier length| TBD (sec)   | see difficulty curve above     |
| anti-cheat tolerance  | TBD (e.g. 1.15) | see anti-cheat formula above |
| hit-stop duration     | 80 (ms) — TUNABLE, playtest, not final | freeze-frame on an accepted hit (physics paused, then resumed); short enough to punctuate impact without stalling the auto-scroll. See "Feel & experience" above |
| screen shake intensity| 0.01 (fraction of viewport) over 200 (ms) — TUNABLE, playtest, not final | on an accepted hit; deliberately well below Phaser's 0.05 default, which is jarring for a dodger. No motion-sensitivity toggle (see "Feel & experience"). See "Feel & experience" above |
| particle burst        | 12 particles/burst, cap 60 concurrent alive — TUNABLE, playtest, not final | one-shot burst on hit (red) and on candy/power-up pickup (warm sparkle); the concurrent-alive cap enforces the "explicit caps on active particles" + graceful-degradation rule in `docs/architecture.md` (explode() emits fewer/none rather than exceeding the cap). See "Feel & experience" above |
| near-miss bonus       | TBD         | see "Feel & experience" above  |
| opening-difficulty floor duration | 10 (sec) — TUNABLE, playtest, not final | length of the gentle-start onboarding window: for the first N seconds of every run, obstacle selection is restricted to baseline `onboardingSafe` rows (see "Onboarding" / "Difficulty floor" under "Feel & experience"). Lives in `DifficultyCurve.ts` as `onboardingDurationSec`, deliberately separate from `difficultyTier` |
