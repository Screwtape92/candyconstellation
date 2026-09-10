# Game Design — Candy Constellation: Space Dodger

An endless vertical space-dodger: an astronaut auto-flies through a candy-asteroid
field, dodging obstacles and collecting candy ingredients to brew the beerfest
beer, with a health bar and power-ups rather than instant death on collision.

See `docs/planning-log.md` for the reasoning behind these decisions. This doc
is the current-state spec — update it whenever a design decision changes.

> **MVP content naming is decided.** The 10 entities in the MVP content table
> below (3 obstacles, 4 power-ups, 3 collectibles) were named and approved by
> the user — the original 8 on 2026-07-15, plus "Sugar Shield" and "Sour
> Blaster" on 2026-09-07. See "MVP content" below. Naming/theme for any
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

**Wired 2026-07-20 (Phase 6.1):** `GameOverScene` now exits to React's
post-game screen as the table specifies, superseding the Phase 2 interim
(restart-on-keypress straight back into `PlayScene`). The crossing is a small
Phaser→React EventBus (`src/game/eventBus.ts`, reusing
`Phaser.Events.EventEmitter`): `GameOverScene.create()` emits
`{ score, elapsedSec }` exactly once, and the React shell (`src/App.tsx`)
swaps the Phaser game out for the post-game name-entry screen
(`src/pages/PostGame.tsx`). `<PhaserGame>` is mounted only while the game view
is active, so leaving the run genuinely unmounts/destroys the Phaser.Game
instance.

Consequence for the "GameOver → next run must be near-instant" requirement in
"Feel & experience" below: the interim's instant in-Phaser restart is gone.
Replaying now routes through the React screens (post-game → leaderboard →
Landing → Play), and a fresh Play re-creates the Phaser.Game
(BootScene→PreloadScene→PlayScene), which re-runs asset preload. Whether that
re-init is fast enough to still satisfy "near-instant replay", or whether the
shell should offer a faster play-again path, is left open for the Phase 6
build-out / Phase 9 tuning to resolve — not decided here.

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
| fire       | `Space`           |

**Fire added 2026-09-07** for the Sour Blaster power-up (see "Power-ups"
below) — it is the only action in this game that isn't movement, and it does
nothing unless Sour Blaster is currently active. `Space` was chosen because
it's the one key a non-gamer already associates with "do the thing" and it
sits nowhere near either movement cluster, so no left hand / right hand
arrangement conflicts with it. Two implementation notes that follow from
that choice, not design decisions: the browser scrolls the page on `Space`
by default, so the canvas must capture the key; and firing is edge-triggered
against the fire-rate cooldown below, so holding the key doesn't need to be
distinguished from tapping it.

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
MVP populates **four** rows of this table (see "MVP content"): "Candy Magnet",
"Candy Heart", "Sugar Shield" and "Sour Blaster". Between them they still only
exercise the two distinct effect shapes the generic interface needs to support
— a continuous timed effect and a one-time instant effect — which is the point:
the two 2026-09-07 additions are both the *timed* shape, so neither one changes
`PowerUpDef`.

`stacking` is per-id, not global: nothing stops Magnet, Shield and Blaster
being active at the same time, and that's intended (a lucky triple pickup
should feel like a lucky triple pickup). Each row's `stacking` only governs
what a repeat pickup of *that same* power-up does while its own window is
still running.

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
- **Sugar Shield** (added 2026-09-07) — structurally identical to Candy
  Magnet: a `durationMs`-based timed effect whose `onApply` sets a flag on
  the player and whose `onExpire` clears it. While the flag is set the player
  takes **no damage at all** from obstacle collisions. Deliberately *not* a
  hit-counting or partial-absorb shield: full invulnerability for the whole
  window, then it simply ends. A hit-counting shield would need a new
  `PowerUpDef` field (charges) and its own expiry path; a plain flag needs
  neither, and "nothing can touch me for N seconds" is also the version a
  non-gamer reads correctly the first time they pick one up. Its `durationMs`
  is its own tunable, independent of Candy Magnet's — the two windows have no
  reason to move together during tuning.
  - It must reuse the **existing** post-hit invulnerability mechanism (see
    "Health" above), not introduce a second parallel one. Design constraint
    that falls out of that: invulnerability has to be evaluated as "is the
    player invulnerable from *any* source right now", not as one boolean that
    the post-hit grace timer owns — otherwise a hit taken just before the
    shield lands would leave a timer running that clears the shield early.
    Same requirement in reverse: the shield expiring must not cancel a
    post-hit grace window that's still running.
  - `stacking: 'refresh'`, matching Candy Magnet — picking up a second shield
    mid-window restarts the clock rather than queueing a second window.
- **Sour Blaster** (added 2026-09-07) — a `durationMs`-based timed effect like
  the two above, but the effect it grants is an *input*: while active, the
  fire key (see "Controls") launches a projectile from the player's position
  that travels up-screen, against the scroll direction, and damages obstacles
  it hits. When the window expires, firing goes dead again. Same flag-on/
  flag-off `PowerUpDef` shape; `stacking: 'refresh'`.
  - **Flag this honestly: Sour Blaster is not a "just add a data row" item.**
    It is the first power-up whose effect isn't expressible as a flag the
    existing systems already read — it needs a projectile entity, a
    projectile-vs-obstacle collision path, and the obstacle durability stat
    below. The `PowerUpDef` row itself stays trivial (set/clear a
    `blasterActive` flag), but the mechanic behind the flag is real systems
    work, in the same way the Black Hole obstacle idea in the stretch backlog
    is. The data-driven promise this doc makes is about *content within an
    existing mechanic*, and this is a new mechanic. Budget it accordingly.
  - **Projectiles are consumed on impact — no piercing.** A piercing shot
    would clear a whole vertical lane for one keypress and make obstacle
    durability nearly meaningless (the tough obstacle behind the weak one
    dies for free), which is the opposite of what the durability stat is
    for. One shot, one impact, keeps "how many hits does this take" a legible
    cost the player can feel.
  - Fire rate is governed by a cooldown tunable, so holding the key produces
    a steady rhythm rather than a continuous stream. Projectile speed and
    per-hit damage are tunables too — all three in the appendix below.
  - Projectiles pass through collectibles and power-up pickups without
    interacting: they exist to break obstacles, and a shot that destroyed
    candy the player wanted would be a trap rather than a reward.
  - A projectile that leaves the top of the screen is destroyed, like any
    other off-screen entity.
  - **The ship itself reskins while active — added 2026-09-08.** `onApply`/
    `onExpire` swap the player's texture between `PLAYER_TEXTURE_KEY` and
    `PLAYER_BLASTER_TEXTURE_KEY` (`data/sprites.ts`), not a separate entity or
    an overlay. This replaced the on-ship badge (`PowerUpBadges.ts`) that
    every other power-up still gets: the ship visibly changing look already
    answers "do I have the gun right now" more directly than a floating icon
    beside it did, so keeping both would have been redundant.

Every numeric constant these four rows introduce — the health-restore amount,
each timed row's own `durationMs`, and the three Sour Blaster projectile
constants — lives in the "Tunables appendix" below as a placeholder, not a
final value.

### Obstacle durability (added 2026-09-07)

Introduced alongside Sour Blaster. Until now obstacles could not be destroyed
at all, so they needed no durability; the moment they can be, they need to
differ in how hard that is, or a blaster that deletes anything in one shot
flattens the three obstacles into one. `SpawnEntry` gains an obstacle-only
`hitPoints` field (see the interface below) — the number of projectile hits
an obstacle absorbs before it's removed from play. Each projectile impact
subtracts the projectile's damage tunable; at zero or below, the obstacle is
destroyed.

- **A destroyed obstacle is out of the run.** It is removed the moment its
  hit points reach zero, and must not also register as a collision/damage
  event against the player — shooting something down and then still taking a
  hit from its corpse would read as broken. Destruction and player-collision
  are mutually exclusive outcomes for a given obstacle.
- **Durability only matters against the blaster.** `hitPoints` has no effect
  on player collisions: touching an obstacle deals its `damage` regardless of
  how much health it has left. Ramming one outright (see the Sugar Shield
  bullet below) ignores `hitPoints` entirely — that stat is specifically
  "how many shots to destroy", not melee toughness.
- **Destroying an obstacle scores — reversed 2026-09-08.** Originally "no
  score, keeps the blaster a survival tool rather than a farming one, and
  avoids re-deriving the anti-cheat bound" — revisited per direct user
  request. `SpawnEntry` gains an obstacle-only `killValue` field, scaled with
  the same size/toughness hierarchy as `hitPoints`: `gummy-meteor` 30,
  `sour-comet` 60, `jawbreaker` 100 (TUNABLE, see appendix). Awarded to
  `ScoreSystem` and shown as a floating "+N" popup (`JuiceSystem`), the same
  treatment as a candy pickup — destroying an obstacle needs to visibly pay
  off, not just feel good. The anti-cheat bound **was** updated to match (see
  "Anti-cheat plausibility formula" below) — shipping the score change
  without it would have let a genuinely skilled/lucky run get wrongly
  rejected as implausible, which is worse than not adding the feature.
- **Sugar Shield also destroys on contact, not just the blaster.** Ramming an
  obstacle while Sugar Shield is active now destroys it outright (ignoring
  remaining `hitPoints`) instead of just bouncing off silently — the same
  reward as a Sour Blaster kill: `killValue` points, the "+N" popup, the
  `obstacle-destroyed` SFX cue. This also fixes a real gap: previously a
  shielded collision produced no sound at all, since `HealthSystem` blocks
  the hit before its damage-sound event ever fires. Checked in `PlayScene`'s
  own overlap handler (`player.shieldActive`), not inside `HealthSystem` —
  this is about what happens to the *obstacle*, not the player's health.

**Spawn table** — generic weighted shape:
```ts
interface SpawnEntry {
  id: string
  kind: 'obstacle' | 'collectible' | 'powerup'
  weight: number
  minTier: number
  spriteKey: string
  damage?: number          // obstacles
  hitPoints?: number       // obstacles only: projectile hits absorbed before destruction (see "Obstacle durability")
  value?: number           // collectibles
  speedMultiplier?: number // optional per-entry override
  onboardingSafe?: boolean // obstacles only: eligible during the onboarding window (see "Onboarding")
}
```

## MVP content

Names approved by the user 2026-07-15, with "Candy Heart" added as a second
power-up in a follow-up decision the same day, and "Sugar Shield" and "Sour
Blaster" added 2026-09-07. The MVP table has **3 obstacle rows, 4 power-up
rows, and 3 collectible rows**. Both the collectible count and the power-up
count were deliberately expanded from their original minimal plans at the
user's explicit choice, since the generic spawn table makes extra rows
low-cost — these are settled scope increases, not mistakes to walk back. (The
Sour Blaster row is the one caveat: the *row* is cheap, the projectile
mechanic behind it isn't — see "Power-ups" above.) This is still
in keeping with the "start simple, but build the generic system first"
tradeoff from the planning log: growing this table further later is still
just adding rows to `src/game/data/{spawnTable,powerUps}.ts` — no new
systems code.

| id                | kind        | notes                                                        |
|-------------------|-------------|----------------------------------------------------------------|
| `gummy-meteor`    | obstacle    | standard obstacle. Lowest `hitPoints` — one Sour Blaster shot destroys it |
| `jawbreaker`      | obstacle    | bigger, slower, higher-damage variant. Highest `hitPoints` — see below |
| `sour-comet`      | obstacle    | trailing hazard tail — visually/behaviorally distinct from the round-asteroid obstacles above. Middling `hitPoints` — see below |
| `candy-magnet`    | powerup     | pulls nearby collectibles toward the player — see "Power-ups" above |
| `candy-heart`     | powerup     | instant, one-time health restore on pickup, capped at `maxHealth` — see "Power-ups" above |
| `sugar-shield`    | powerup     | timed full invulnerability while active — see "Power-ups" above |
| `sour-blaster`    | powerup     | timed; enables firing projectiles that destroy obstacles — see "Power-ups" above |
| `hop-nebula-dust` | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |
| `malt-meteorite`  | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |
| `candy-star`      | collectible | candy-ingredient pickup (beer-brewing tie-in)                   |

**Why the obstacles' `hitPoints` land where they do** (values themselves are
placeholders in the appendix — TUNABLE, playtest, not final):

- `gummy-meteor` is the baseline the whole spawn table is balanced around and
  the only `onboardingSafe` row, so it's also the obstacle a player is most
  likely to be shooting at. One shot, one kill.
- `jawbreaker` is the toughest by a clear margin, and this is the one
  assignment that isn't arbitrary: a real jawbreaker is famously the sweet you
  cannot get through — that's the entire identity of the candy. Making it the
  obstacle that soaks the most shots is the durability system agreeing with
  the name for once, rather than a number picked to fill a gap. It also
  already reads as the heavy in every other stat (bigger, slower, double
  damage), so toughness is the consistent reading. Practically, killing one
  should cost a noticeable slice of a single Sour Blaster window, so
  "shoot the jawbreaker or dodge it and spend the window elsewhere" is a real
  in-the-moment choice.
- `sour-comet` sits in the middle, and it's there for a behavioural reason
  rather than a toughness one. Its distinctiveness is that it's *fast*
  (`speedMultiplier` 1.4) with a trailing tail — so the difficulty of
  removing one is already front-loaded into *hitting* a fast-moving target
  with a non-piercing projectile. Stacking high `hitPoints` on top of that
  would double-charge the player for the same trait and make the comet feel
  like a second jawbreaker instead of its own thing. A comet is loose ice and
  debris anyway, not a hard candy shell. Above baseline, well below the
  jawbreaker.

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
- ~~**2 additional power-ups**~~ — **resolved 2026-09-07, no longer backlog.**
  The user named and approved Sugar Shield and Sour Blaster, which are now
  committed MVP content in the table above, not stretch scope. Nothing
  remains of this item. Any power-up *beyond* those four is still unnamed and
  undesigned, and the standing rule applies: do not invent one until the user
  specifies it.

## Scoring

```
score = survivalPointsPerSec * elapsedSec
      + Σ(candyValue for each pickup)
      + Σ(killValue for each obstacle destroyed)   // constants TBD/tunable
```

Added 2026-09-08: the kill term, for destroying an obstacle instead of
letting it pass (Sour Blaster, or ramming one with Sugar Shield up) — see
"Obstacle durability" above for the reversal this represents and the
per-obstacle values.

Optional combo/streak multiplier left unspecified — decide during playtesting
if base scoring feels flat.

## Anti-cheat plausibility formula

Server-side check on score submission (see `docs/architecture.md` for where
this runs):

```
maxPlausibleScore(elapsedSec) =
  ( survivalPointsPerSec * elapsedSec
    + maxCandyRatePerSec * elapsedSec
    + maxKillRatePerSec * elapsedSec )
  * toleranceMultiplier                                  // e.g. 1.15, TUNABLE

reject submission if:
  score > maxPlausibleScore(elapsedSec)
  OR elapsedSec < minViableRunSec
  OR elapsedSec > maxViableRunSec                         // added 2026-09-09
  OR elapsedSec is an integer                             // added 2026-09-09
```

**`maxViableRunSec` + integer-`elapsedSec` rejection — added 2026-09-09, live
at the beerfest event.** The ratio check above is a generous ceiling by
design (favours false-accept over false-reject of an honest great run), which
means it has no opinion on whether `elapsedSec` itself is real — a request
sent directly to `submitScore` (curl/devtools, bypassing the game entirely)
can declare an arbitrarily large `elapsedSec` and get a proportionally huge
`score` waved through. Exactly this happened live: several submissions with
names like "Pwned & Hacked" / "HackerMan2000" used `elapsedSec` values from
2000 to 86400 (33 min to 24h — no real run gets remotely close) to legitimize
7-8 digit scores. Two mutually-reinforcing checks added in response:

- `maxViableRunSec` (placeholder **1800s / 30 min**, `MAX_VIABLE_RUN_SEC` in
  `api/shared/antiCheat.ts`) — generous ceiling, not a tuned value; no genuine
  run gets anywhere near it given the difficulty ramp and health system.
- Reject non-fractional `elapsedSec`. The client (`ScoreSystem.elapsedSec`,
  `src/game/systems/ScoreSystem.ts`) computes it from Phaser's frame-
  accumulated clock (`(time.now - time.startTime) / 1000`), which essentially
  never lands on an exact whole number — every genuine submission on record
  has a many-decimal-digit value. This one alone catches short fabricated
  values too (e.g. `elapsedSec: 200`), which `maxViableRunSec` doesn't touch.

The `maxViableRunSec` bound alone doesn't catch a short fabricated pair (a
attacker claiming a plausible-length run with a plausible-for-that-length
score is indistinguishable from a real one by either check) — this only
closes the "absurdly long claimed run" exploit actually observed, not
impersonation/fabrication in general, which remains the accepted limitation
described in `docs/architecture.md`'s "Rate-limiting" section.

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

**`maxKillRatePerSec` — added 2026-09-08** alongside the kill-scoring
reversal above (`api/shared/antiCheat.ts`). Deliberately flat, not
time-varying like the candy term: kill rate is gated by Sour Blaster's fire
cooldown, which doesn't change over a run, not by spawn cadence. Generous by
the same "real players can't approach this" standard as the candy bound — it
assumes Sour Blaster is active for the *entire* run (a real player gets it in
occasional ~6s windows) and every single shot lands on the single
highest-value obstacle (`jawbreaker`). This also safely covers the Sugar
Shield kill path: ramming obstacles can't destroy them faster than the
blaster's fire-rate-bounded ceiling already assumes.

## Run token verification

**Added 2026-09-09, live at the beerfest event**, closing a gap the checks
above can't: the plausibility formula only judges whether `score` is
realistic *for the claimed* `elapsedSec` — it has no way to tell whether
`elapsedSec` itself is real, since it was otherwise pure client-reported
input. A fabricated-but-realistic pair (chosen well inside the formula's
generous ceiling, with a normal-looking fractional value) is completely
indistinguishable from a genuine great run. This was exploited live: an
entry named "Marco Hacked Again" reached #1 with a plausible-looking
430-second/14850-point submission, then a second one hit 267,300 points
before this fix shipped — both would have sailed past every check in the
"Anti-cheat plausibility formula" section above unnoticed if the name hadn't
announced it.

The fix ties `elapsedSec` to real server-observed time instead of trusting
it as self-reported:

- `POST /api/startRun` issues a single-use, server-timestamped token the
  moment a run actually begins (`PlayScene.create()`, fire-and-forget —
  starting a run must never wait on this, same principle as
  `docs/architecture.md` "Score-submission resilience"). The token rides
  through `GameOverScene` → the `GAME_OVER_EVENT` payload → `PostGame` →
  `submitScore`, unchanged, including through the offline retry queue if the
  first submission attempt fails (important: a *later* retry must keep using
  the *original* token, not a freshly-issued one — a fresh token's age would
  always be too small to cover the claimed `elapsedSec`; the original token's
  age only grows more permissive the longer a retry is delayed).
- `submitScore` now requires this token, consumes it (single-use — replaying
  one token for a second submission is rejected), and checks:
  `claimedElapsedSec <= (now - tokenIssuedAtUtc) + clockSkewToleranceSec`.
  A submission can never claim more play time than has actually elapsed,
  wall-clock, since its run began.
- `maxViableRunSec`-equivalent ceiling on token age (`RUN_TOKEN_MAX_AGE_SEC`,
  placeholder **3600s / 1h**, generous — covers a player lingering on the
  name-entry screen or a long offline retry wait) bounds both storage growth
  and how long a token stays valid at all.
- A submission with no token, an unknown token, an already-consumed token, or
  a token whose age doesn't cover the claim is rejected with the same 422
  message as the plausibility check ("Score is not plausible for the
  reported run length.") — deliberately not distinguished from that check in
  the response, so there's no benefit to an attacker in probing which
  specific rule caught them.

**What this doesn't close**: an attacker who actually *waits* the real
wall-clock duration they intend to claim, then submits a plausible score for
it, still isn't distinguishable from a genuine player — there's no
server-authoritative simulation of the actual game, which would be a much
larger undertaking than fits this project's scope. What this closes is the
*instant* fabrication pattern actually observed (submit any score/duration
pair in a fraction of a second via curl/devtools) by forcing a minimum real
wait proportional to the claim. Verified 2026-09-09 against the self-hosted
server: a token-less submission is rejected (400), a fresh token immediately
used to claim a long run is rejected (422), a genuine short wait followed by
a matching claim is accepted (201), replaying a consumed token is rejected
(422), and an unknown/bogus token is rejected (422).

Implemented on both backends — self-hosted (`server/runTokens.ts`, SQLite
`run_tokens`/`run_token_rate_limits` tables, live-tested above) and Azure
Functions (`api/startRun/`, `api/shared/runTokenStore.ts`, Table Storage
`RunTokens`/`RunTokenRateLimits` tables) — for the same reason the rest of
`api/shared/` is kept storage-agnostic and shared: `api/shared/runToken.ts`'s
`isValidRunDuration` check is pure logic, storage-agnostic, imported directly
by both. The Azure side type-checks and builds but — like the rest of that
path — hasn't been live-tested against real Table Storage tonight (the
subscription is still `Disabled`; see `docs/architecture.md` "Self-hosted
deployment").

## Score decomposition check

**Added 2026-09-09, live at the beerfest event**, closing a narrower residual
gap the run-token check above doesn't: even with `elapsedSec` now tied to
real time, a submission could still fabricate a `score` that merely sits
under the plausibility ceiling for that duration — indistinguishable from a
genuinely great run by ratio alone. This check instead requires the total to
be *exactly* reconstructible from the game's real, discrete scoring rules,
not just plausible:

```
score = floor(survivalPointsPerSec * elapsedSec) + candyPoints + killPoints
```

(`ScoreSystem.ts`'s actual `current` getter — floor(A + integer) = floor(A) +
integer lets the survival term be floored on its own here.) Every
collectible is worth exactly `COLLECTIBLE_VALUE` (50) and every obstacle kill
one of three fixed values (30/60/100, `spawnTable.ts`) — all multiples of
10 — so a genuine score's "active" component (`score` minus the survival
floor) is always exactly reconstructible from those denominations. A
fabricated number can only satisfy this by reverse-engineering the actual
scoring internals (which values, which floor semantics), not by picking
anything that merely looks plausible — a materially higher bar than any
attack actually observed tonight.

- `PlayScene`/`ScoreSystem` now report `candyPoints`/`killPoints` (the
  running tallies already tracked internally) alongside `score`/`elapsedSec`/
  `runToken`, riding the same GameOver → `submitScore` path.
- `submitScore` checks, in order: `candyPoints` is a non-negative multiple of
  50; `killPoints` is reachable as a non-negative combination of {30, 60,
  100} (a single small loop suffices — 60 is a multiple of 30, so only the
  jawbreaker (100) count needs enumerating, see
  `api/shared/scoreDecomposition.ts`); and the reconciliation formula above
  holds exactly. Any failure gets the same rejection message as every other
  anti-cheat check, for the same reason: no benefit to an attacker in
  learning which specific rule caught them.
- This check is additive to, not a replacement for, the plausibility ratio
  and run-token checks above — all three must pass.
- Retroactively audited the 87 pre-existing entries against this formula
  (without it being enforced at submission time, since it didn't exist yet):
  zero violated it, including all three of Kian's runs — see the "is Kian's
  score legitimate" conversation this same night for the full walkthrough.
  That's reassuring but not proof on its own for anything submitted before
  this check went live; going forward, it's an enforced gate, not just an
  audit.
- **Superseded within hours.** Two more fabricated entries ("Marco Hacked
  Again", "BetterThanHacker" — both self-admitted, both ~1499s/25min claimed
  runs with a valid decomposition) landed after this check went live but
  before "Live progress verification" below did, confirming exactly the gap
  that section describes: a correct decomposition alone was never going to
  be the last word, because it says nothing about whether the numbers were
  produced by playing.

## Live progress verification

**Added 2026-09-09, live at the beerfest event** — the strongest layer yet,
prompted directly by a user question: *"people are using Claude to hack
this, and for Claude to read source and fake the run seems relatively
easy?"* That reframes the threat model in a way every check above still
doesn't close. Run-token verification (above) ties `elapsedSec` to real
time; the score decomposition check ties `score` to the game's actual
denominations — but both are checks against a claim made *after the fact*.
Nothing so far requires anything to happen *during* the run. Reading the
publicly-served source (candy=50, kill=30/60/100, the plausibility formula,
the token/decomposition rules themselves) and writing a script that waits
the right amount of real time, then submits one correct-looking report, is
exactly the kind of task an AI assistant does in minutes — no meaningful
skill barrier left, which is precisely how "Hackerman2000" (elapsedSec
1217.453, a valid decomposition, real wait confirmed by run-token) got to
#2 on the board, and how two more got past even the decomposition check
afterward (see above).

The fix stops trusting a single end-of-run report at all. `PlayScene` now
reports its cumulative `candyPoints`/`killPoints` to a new
`POST /api/reportProgress` every `REPORT_INTERVAL_MS` (3s) while a run is in
progress, plus once more at the exact moment of death (the periodic timer
stops the instant the scene pauses for GameOver, so this explicit final
call is what keeps the last checkpoint from lagging behind the true final
tally by up to a full interval). The server keeps its own running
checkpoint per token (`run_tokens`' new `last_report_at_utc`/
`last_candy_points`/`last_kill_points`/`flagged` columns, or the Table
Storage equivalent), and `submitScore` now requires the final claim to
match that checkpoint *exactly*, checkpointed close to when the run claims
to have ended.

Two validations happen on every `/api/reportProgress` call
(`api/shared/liveProgress.ts`), both necessary together — either alone
degenerates back to a whole-run check with no more teeth than what already
existed:

- **Delta bounded by real elapsed time since the *previous* checkpoint**
  (not since run start) — reuses the same `maxCandyRatePerSec`/
  `maxKillRatePerSec` ceilings from the plausibility formula, now evaluated
  over each short interval instead of the whole run, with a looser
  tolerance (`DELTA_TOLERANCE_MULTIPLIER = 3`, vs. 1.15 for the whole-run
  ceiling — short intervals are exactly where a legitimate burst, e.g.
  Candy Magnet pulling in several candies at once, reads as a spike
  relative to its own tiny window).
- **A hard cap on the gap itself** (`MAX_REPORT_GAP_SEC = 12`, generous
  against the 3s client cadence) — without this, an attacker could send
  just two checkpoints (start and end) and the delta-vs-gap math would
  reduce to exactly the same whole-run ratio check that already existed,
  no better. Requiring frequent checkpoints is what actually forces a
  real, continuous process running for the *entire* claimed duration,
  rather than one number computed after the fact.

At submission, `isFreshCheckpoint` (same file) checks the last checkpoint
landed within `MAX_REPORT_GAP_SEC` of the *claimed run end*
(`issuedAtUtc + elapsedSec`) — deliberately not of "now": submission can be
delayed arbitrarily by the post-game name-entry screen or the offline retry
queue (docs/architecture.md "Score-submission resilience"), and neither
should ever make an honest, already-finished run look stale.

**What this doesn't close**: someone willing to actually run a script for
the entire real duration, correctly pacing plausible-looking increments the
whole time (not just at the start and end), still can't be distinguished
from a genuine player without full server-side game simulation — a
categorically larger undertaking, explicitly out of scope (see the
"server-side simulation" conversation this same night). What this closes
is turning that from a five-minute AI-assisted task into something that
requires sustained engineering effort matching the real time investment of
actually playing — a meaningfully different threat model for a casual
beerfest leaderboard.

Verified 2026-09-09 against the self-hosted server: a token-and-wait
submission with zero progress reports is rejected (422); a "front-load"
attempt (report almost nothing, then claim a huge late jump) is rejected at
the report itself (`{"ok":false}`, token flagged) and any later submission
against that token then fails too; a 20-second gap between reports flags
the token the same way; and a genuine run reporting real, paced progress
throughout is accepted (201) with the exact same total a hand-fabricated
submission would have needed to reverse-engineer.

Implemented on both backends, same pattern as run-token verification and
score decomposition: `api/shared/liveProgress.ts` holds the storage-agnostic
validation logic, `server/runTokens.ts` (SQLite) and
`api/shared/runTokenStore.ts` (Table Storage) each do their own
lookup/update. Live-tested against the self-hosted server above; the Azure
side type-checks and builds but hasn't been exercised against real Table
Storage tonight, same caveat as every other Azure-path addition this
session.

## Audio spec

**Being built up incrementally from 2026-09-08**, one real user-supplied cue
at a time, rather than landed all at once — an earlier all-Kenney-CC0 first
attempt didn't sound right and was fully reverted. Track/cue list, with
status:

- **Music: one background track, site-wide.** ✅ Implemented — but broader
  than originally specced: not scoped to `PlayScene`, but truly global
  ("must always play, game or no game," 2026-09-08). `src/site/
  BackgroundMusic.tsx` mounts a plain HTML5 `<audio>` element once at the
  App root, outside the view switch, so it's never stopped or restarted by
  navigating between Landing/BuildStory/in-game/PostGame/Leaderboard —
  deliberately separate from Phaser's own audio, which lives and dies with
  each run's `Phaser.Game` instance. Autoplay only actually starts once the
  browser sees a user gesture (click/keydown anywhere), per standard browser
  autoplay policy — there's always one within the first few seconds
  (IntroSplash, any button), so this isn't a real gap in practice.
- SFX: candy pickup, obstacle hit, power-up activate, game over, UI click,
  obstacle destroyed — not yet sourced. Blaster fire ✅ implemented, and
  atypical: it's a continuous rapid-fire *loop* (`BlasterSystem.ts`'s
  `laserLoop`), not a one-shot retriggered per projectile — started the
  instant the fire key is actually held (independent of the cooldown-gated
  projectile spawn rate) and stopped the instant it's released, so it reads
  as one continuous stream rather than discrete clicks.
- Volume/mute preference persisted to `localStorage`: not yet built — no
  mute control exists yet for either the site music or in-game SFX. Revisit
  once more cues land.

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

**Active power-up readout (HUD)**

Decided 2026-09-07. Any power-up with `durationMs > 0` shows a visible
remaining-duration indicator in the HUD while it's active — a countdown, a
depleting bar, or an equivalent. This is **generic to the timed
`PowerUpDef` shape, not per-power-up**: it covers Candy Magnet today and
Sugar Shield and Sour Blaster automatically, and any timed row added later
gets it for free with no HUD change. Instant power-ups (Candy Heart,
`durationMs: 0`) have nothing to show and don't appear.

The trigger for adding this is that a timed effect whose end you can't see is
a bad surprise: the moment a Sugar Shield silently expires is the moment the
player takes a hit they thought they were immune to, and a Sour Blaster that
stops firing mid-press reads as a broken key rather than an expired window.
Requirements:

- It must read at a glance without obscuring gameplay — the same
  visual-readability constraint this doc already applies to entity
  silhouettes below. The play area is 720×960 and busy; this is a periphery
  element, not an overlay.
- Since multiple different power-ups can be active at once (see "Power-ups"),
  it must be unambiguous *which* effect each indicator belongs to.
- The last moments before expiry should be distinguishable from the middle of
  the window (however the chosen treatment expresses that), so the end isn't a
  cliff the player only notices after it's happened.

Exact visual treatment — numeric countdown vs. depleting bar vs. shrinking
icon, and where it sits — is an implementation detail, left to whoever builds
the HUD.

**Corrected 2026-09-07 (first playtest of this feature):** the corner HUD
bars alone weren't enough — "not obvious that you have powerups" was the
direct feedback. Two fixes:

- **On-ship badges, not just a corner readout.** Each active timed power-up
  now also shows a badge anchored to the ship itself — reusing the power-up's
  own pickup icon (already legible, already themed) rather than an invented
  abstract indicator: Sugar Shield as a translucent bubble around the ship,
  Candy Magnet and Sour Blaster as their own icons flanking it. This is the
  thing that actually answers "do I have a power-up right now" at a glance;
  the HUD bars answer "how much longer," a secondary question.
- **The corner HUD moved from top-left to top-right, depth-boosted above
  everything.** Top-left, directly under Health/Score, sat in a stretch of
  screen the player's fully-free-roaming ship can fly through — the bars
  could end up reading as hidden behind the ship. Top-right is otherwise
  empty, and the readout now renders at a depth above every gameplay entity
  and on-ship badge, so this can't recur regardless of where the ship goes.

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
- **Sour Blaster's fire key: one-time on-pickup hint, decided 2026-09-07.**
  The precedent for the other three power-ups is no onboarding treatment at
  all — Candy Magnet and Candy Heart just happen to you, and you understand
  them by watching the screen. Sugar Shield inherits that unchanged: it's
  also purely passive, so it needs nothing. Sour Blaster is the exception,
  and the reason is narrow and specific: it is the only power-up in the game
  whose effect **does not happen unless the player presses a key they have
  never been asked to press**, in a game that until that moment has only four
  movement keys and no text tutorial. A non-gamer's most likely outcome is
  picking one up, noticing nothing, and never learning the mechanic exists —
  the pickup is silently wasted, which is worse than the pickup not existing.
  So: the **first** time a player collects a Sour Blaster in a session, show a
  brief, non-blocking hint naming the fire key (the shortest thing that works
  — e.g. a "SPACE" prompt near the ship, fading on its own). Subsequent
  pickups show nothing.
  - This is deliberately not a walked-back "no text tutorial" decision. That
    rule is about a tutorial *screen* standing between the player and the
    game; this is a one-line diegetic prompt that appears during play, costs
    no click, blocks nothing, and never repeats.
  - It must respect the visual-readability constraint below and must not
    obscure the play area at the moment a power-up has just spawned obstacles
    around the player.
  - Whether "first time in this session" or "first time ever, persisted to
    `localStorage`" is the right scope is an implementation detail; session
    scope is the simpler default and is fine for a short-lived event piece.

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

Extended 2026-09-07: Sour Blaster projectiles are a new upward-moving entity
class and fall under the same constraint — a projectile must never be
mistakeable for a collectible or an incoming hazard. Direction of travel helps
(everything else on screen moves down; projectiles are the only thing moving
up), but it shouldn't be the only cue. Sugar Shield also needs a persistent
on-ship visual while active, distinct from the post-hit invulnerability
flicker, so "am I currently immune" is answerable without reading the HUD
timer.

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
| ship acceleration     | 6000 (px/s²) — TUNABLE, playtest, not final | feel constant (`ACCELERATION` in `Player.ts`). Raised from the Phase 2.1 placeholder (2400) after the first Phase 4.3 playtest round — testers found movement sluggish. Reaches `MAX_SPEED` in ~0.1s so direction changes read as near-instant |
| ship drag             | 6000 (px/s²) — TUNABLE, playtest, not final | feel constant (`DRAG` in `Player.ts`). Raised from 1600 in the same Phase 4.3 pass; matched to acceleration so stopping/reversing is as crisp as accelerating rather than floaty |
| ship max speed        | 600 (px/s) — TUNABLE, playtest, not final | `MAX_SPEED` in `Player.ts`. Raised from 420 in the same Phase 4.3 pass so the narrower 720px-wide portrait canvas still crosses quickly (~1.2s full width) without being twitchy for the non-gamer onboarding audience |
| spawn jitter range    | TBD         | avoids metronomic spawn timing |
| survival points/sec   | 2 (points/sec) — TUNABLE, playtest, not final | survival term of the scoring formula (see "Scoring" above). Lowered from 10 after the Phase 4.3 playtest: at 10/sec, passively surviving dominated the score and there was no incentive to risk a detour for candy. Now a modest baseline that still rewards a longer run; candy (value 50 each) is the dominant, risk-driven lever — see "collectible value" below |
| collectible value     | 50 (points/pickup) — TUNABLE, playtest, not final | `value` on all three collectible rows in `spawnTable.ts` (equal across `hop-nebula-dust`/`malt-meteorite`/`candy-star`, per the undifferentiated-pickup MVP decision — only the magnitude changed). Raised from 10 in the same Phase 4.3 pass alongside the survival cut so actively pursuing candy is the bigger score lever over a run: each pickup ≈ 25s of survival, so a handful of pickups outweighs the idle-survival baseline |
| max health            | TBD (health units) | starting/maximum player health, see "Health" above |
| invulnerability window| TBD (ms)    | post-hit grace period          |
| power-up duration     | 6000 (ms) — TUNABLE, playtest, not final | Candy Magnet's `PowerUpDef.durationMs`. Each timed power-up owns its own duration constant (see the two rows below) — Candy Heart is instant, `durationMs: 0` |
| Candy Heart restore amount | 1 (health units) — TUNABLE, playtest, not final | amount restored on pickup, capped at `maxHealth` (currently 3); one unit is a meaningful but not full heal |
| Sugar Shield duration | 5000 (ms) — TUNABLE, playtest, not final | Sugar Shield's own `PowerUpDef.durationMs`, independent of Candy Magnet's. Starting placeholder set slightly shorter than the Magnet's because total immunity is a stronger effect than a pickup pull; expect this to move most of any tuning round |
| Sour Blaster duration | 6000 (ms) — TUNABLE, playtest, not final | Sour Blaster's own `PowerUpDef.durationMs`. Placeholder matched to the Magnet's for now — long enough that the fire-key hint (see "Onboarding") is still on screen while the player has something to shoot |
| projectile speed      | 700 (px/s) — TUNABLE, playtest, not final | up-screen speed of a Sour Blaster projectile. Must stay clearly faster than the ship (`MAX_SPEED` 600) and faster than the fastest obstacle at the tiers where a blaster is likely picked up, or shots visibly fail to catch what the player aimed at |
| projectile fire cooldown | 250 (ms) — TUNABLE, playtest, not final | minimum interval between shots while Sour Blaster is active, so holding `Space` gives a rhythm rather than a stream. At this placeholder a 6000ms window is ~24 shots — enough to matter, not enough to clear the screen |
| projectile damage     | 1 (hit point) — TUNABLE, playtest, not final | subtracted from an obstacle's `hitPoints` per impact. At 1, the `hitPoints` values below read directly as "shots to destroy" |
| obstacle hit points   | `gummy-meteor` 1, `sour-comet` 2, `jawbreaker` 4 — TUNABLE, playtest, not final | `hitPoints` on the obstacle rows in `spawnTable.ts`; shots-to-destroy at the placeholder projectile damage of 1. Rationale for the ordering is in "MVP content" above — the jawbreaker's gap over the others is intentional, not just an increment |
| obstacle kill value   | `gummy-meteor` 30, `sour-comet` 60, `jawbreaker` 100 — TUNABLE, playtest, not final | `killValue` on the obstacle rows in `spawnTable.ts` (added 2026-09-08); score awarded for destroying rather than dodging. Scaled with the same size/toughness ordering as hit points above |
| max kill rate (anti-cheat) | 400 (points/sec) — TUNABLE, placeholder, not final | `maxKillRatePerSec()` in `api/shared/antiCheat.ts` = `MAX_OBSTACLE_KILL_VALUE / (BLASTER_FIRE_COOLDOWN_MS / 1000)` = 100 / 0.25; a deliberately generous flat ceiling (see "Anti-cheat plausibility formula" above) |
| spawn base cadence    | 800 (ms) — TUNABLE, playtest, not final | `spawnBaseMs` in `DifficultyCurve.ts`, the `t=0` spawn interval feeding `spawnIntervalMs(t)`. Lowered from 900 after the first Phase 4.3 playtest round ("too easy") to raise post-onboarding baseline density slightly |
| spawn ramp rate       | 0.25 (coeff) — TUNABLE, playtest, not final | `spawnRampCoeff` in `DifficultyCurve.ts`; how fast the `sqrt(t)` cadence ramp climbs. Raised from 0.1 in the same Phase 4.3 pass — the old value barely tightened cadence within a minute of play (~900ms→~510ms by t=60s); now ~800ms→~270ms by t=60s |
| obstacle speed ramp   | base 220 (px/s), coeff 30 — TUNABLE, playtest, not final | `speedBasePxPerSec` / `speedAccelCoeff` in `DifficultyCurve.ts` feeding `obstacleSpeed(t)`. `speedAccelCoeff` raised from 12 in the same Phase 4.3 pass so obstacle speed roughly doubles over the first minute (~220→~450 px/s by t=60s) instead of climbing only ~40%. Base kept at 220 — the onboarding window already protects the gentle opening |
| difficulty tier length| TBD (sec)   | see difficulty curve above     |
| anti-cheat tolerance  | 1.15 — TUNABLE, placeholder, not final | `toleranceMultiplier` in the anti-cheat formula above; mirrored server-side as `TOLERANCE_MULTIPLIER` in `api/shared/antiCheat.ts` |
| minimum viable run    | 1 (sec) — TUNABLE, placeholder, not final | `minViableRunSec` in the anti-cheat formula above: submissions reporting a shorter run are rejected as implausible. Mirrored server-side as `MIN_VIABLE_RUN_SEC` in `api/shared/antiCheat.ts` |
| maximum viable run    | 1800 (sec / 30 min) — generous ceiling, not tuned | `maxViableRunSec` in the anti-cheat formula above, added 2026-09-09 after live-event abuse (see that section). `MAX_VIABLE_RUN_SEC` in `api/shared/antiCheat.ts` |
| hit-stop duration     | 80 (ms) — TUNABLE, playtest, not final | freeze-frame on an accepted hit (physics paused, then resumed); short enough to punctuate impact without stalling the auto-scroll. See "Feel & experience" above |
| screen shake intensity| 0.01 (fraction of viewport) over 200 (ms) — TUNABLE, playtest, not final | on an accepted hit; deliberately well below Phaser's 0.05 default, which is jarring for a dodger. No motion-sensitivity toggle (see "Feel & experience"). See "Feel & experience" above |
| particle burst        | 12 particles/burst, cap 60 concurrent alive — TUNABLE, playtest, not final | one-shot burst on hit (red) and on candy/power-up pickup (warm sparkle); the concurrent-alive cap enforces the "explicit caps on active particles" + graceful-degradation rule in `docs/architecture.md` (explode() emits fewer/none rather than exceeding the cap). See "Feel & experience" above |
| near-miss bonus       | TBD         | see "Feel & experience" above  |
| opening-difficulty floor duration | 10 (sec) — TUNABLE, playtest, not final | length of the gentle-start onboarding window: for the first N seconds of every run, obstacle selection is restricted to baseline `onboardingSafe` rows (see "Onboarding" / "Difficulty floor" under "Feel & experience"). Lives in `DifficultyCurve.ts` as `onboardingDurationSec`, deliberately separate from `difficultyTier` |
