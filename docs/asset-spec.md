# Asset Spec — Candy Constellation: Space Dodger

See `docs/planning-log.md` for context and `docs/game-design.md` for the
spawn-table entries these assets back. This doc is the current-state spec —
update it whenever an asset decision changes.

> **MVP content naming is decided.** The 8 entities in the "MVP sprite list"
> below (3 obstacles, 2 power-ups, 3 collectibles) were named and approved by
> the user on 2026-07-15 — see `game-design.md`'s "MVP content" section.
> Naming/theme for any *future* sprite beyond this MVP set is still
> undecided; confirm with the user before naming or theming anything not
> already in the table below.

## Canvas

- 720×960, portrait, fixed aspect ratio (desktop web only, keyboard/mouse —
  no mobile/touch sizing or input). Corrected 2026-07-17 from an originally-
  planned 960×540 landscape canvas — better fit for a vertical dodger's need
  for player-reaction travel distance; see `docs/architecture.md`'s Platform
  section for the full reasoning. Still desktop-only, not a mobile/portrait-
  phone target — "portrait" here describes the fixed canvas shape, not a
  responsive mobile layout.
- **Pixel-art scale factor: 1× (native authoring). Decided 2026-07-20**
  (Phase 7 kickoff, `sprite-integrator`; supersedes the 2026-07-15 defer-to-
  Phase-7 placeholder). Sprites are authored in PixelLab at their exact
  on-canvas pixel dimensions (see the size table under "MVP sprite list"
  below) — one art pixel maps to one 720×960 canvas pixel, drawn at Phaser
  scale 1. Pixel-art "chunkiness" is therefore controlled by keeping each
  sprite's authored resolution modest (24–64 px), not by upscaling a smaller
  base in-engine.
  - **Why 1× and not an upscaled low-res base** (e.g. author at 16 px, draw
    at 3–4×):
    1. The canvas is scaled per-player by `Phaser.Scale.FIT`
       (`docs/architecture.md`, "Display/scaling mode") to fit each unknown
       browser window — an inherently *fractional* scale. Adding a fixed
       integer pre-scale on top would compound into uneven art-pixel sizes,
       not cleaner ones.
    2. At the sizes below the art already reads unmistakably as pixel art; a
       coarser base isn't needed for the style.
    3. "Visual readability" (`game-design.md`) needs six round-ish entities
       (3 obstacles + 3 collectibles) to hold distinct silhouettes on a busy
       screen. A 16 px base can't give each a distinguishable shape; ~24–56 px
       can.
  - **Rendering dependency (flagged — one-line `src/` change, not part of this
    docs task):** crisp pixel art needs nearest-neighbor sampling, so
    `src/game/config.ts` should set `pixelArt: true` (currently unset, so
    textures are linear-filtered and will look soft — especially where FIT
    upscales on a large monitor). Called out here so whoever wires the real
    sprites in doesn't miss it.

## MVP sprite list

Mirrors the spawn-table rows in `docs/game-design.md`:

| role                 | maps to (game-design)              | name             | animation states needed                  |
|----------------------|-------------------------------------|------------------|--------------------------------------------|
| ship                 | player                              | —                | idle, fly/loop, hit-flash                   |
| `gummy-meteor`       | spawn table `gummy-meteor`          | Gummy Meteor     | idle/loop, hit-flash (on collision)         |
| `jawbreaker`         | spawn table `jawbreaker`            | Jawbreaker       | idle/loop, hit-flash                        |
| `sour-comet`         | spawn table `sour-comet`            | Sour Comet       | idle/loop (trailing tail baked into loop frames), hit-flash |
| `candy-magnet`       | spawn table `candy-magnet`          | Candy Magnet     | idle/loop (world sprite), activate (HUD icon)|
| `candy-heart`        | spawn table `candy-heart`           | Candy Heart      | idle/loop (world sprite), pickup-burst (see note below) |
| `hop-nebula-dust`    | spawn table `hop-nebula-dust`       | Hop Nebula Dust  | idle/loop, pickup-sparkle                   |
| `malt-meteorite`     | spawn table `malt-meteorite`        | Malt Meteorite   | idle/loop, pickup-sparkle                   |
| `candy-star`         | spawn table `candy-star`            | Candy Star       | idle/loop, pickup-sparkle                   |
| background           | —                                    | —                | vertically tileable, parallax layers        |

### Pixel dimensions, orientation & frame counts (finalized 2026-07-20, Phase 7 kickoff)

Dimensions are on-canvas pixels (= authored PixelLab resolution, per the 1×
scale factor under "Canvas" above). All chosen on a multiple-of-8 grid
(PixelLab works naturally in 16/24/32/48/64; even dimensions keep the centered
`hitboxScale` math clean) and anchored to the Phase 4.3-playtested placeholder
footprints in `src/game/scenes/PreloadScene.ts` so the validated dodging feel
is preserved — only small, justified nudges from those.

| role | dimensions (w×h) | vs placeholder | orientation / facing |
|------|-------------------|----------------|-----------------------|
| ship (player)     | 40×40 | 32×32 → +8 | Faces **up** (nose toward top = direction of travel). Static orientation — 4-directional movement does **not** rotate/flip/bank the sprite. |
| `gummy-meteor`    | 40×40 | unchanged  | Radially symmetric — no facing; idle/loop is a slow spin. |
| `jawbreaker`      | 56×56 | unchanged  | Radially symmetric — no facing. Largest obstacle silhouette reads as the heavy, high-damage variant. |
| `sour-comet`      | 24×64 | 24×60 → +4h| **Directional (vertical):** head at the bottom (leading edge, travels downward), tail streaming **up**; tail baked into the loop frames. Not mirrored horizontally. |
| `candy-magnet`    | 32×32 | 30×30 → +2 | Upright magnet icon; no facing. |
| `candy-heart`     | 32×32 | 30×30 → +2 | Upright, symmetric; no facing. Same 32×32 footprint as `candy-magnet` so the two power-ups read as one class. |
| `hop-nebula-dust` | 24×24 | 26×26 → −2 | Symmetric; no facing. |
| `malt-meteorite`  | 24×24 | 26×26 → −2 | Symmetric; no facing. |
| `candy-star`      | 24×24 | 26×26 → −2 | Symmetric; no facing. |
| background        | 720×960 per layer | — | See "Background" below. |

Size hierarchy this produces (deliberate, serves "Visual readability" in
`game-design.md`): collectibles 24 < power-ups 32 ≈ player 40 < obstacles
40/56, with `sour-comet`'s tall 24×64 silhouette and the round meteors' bulk
keeping hazards visually "heavier" than the small candy pickups. Once flat
placeholder colours are gone, silhouette does the heavy lifting: the
star/heart/magnet shapes and the astronaut ship are all distinct at a glance,
and the three round collectibles stay separable by their 24 px silhouettes
(dust cloud vs. grain vs. star) plus palette.

**Feel note for `game-designer` (per the handoff rule — I don't edit
`hitboxScale` myself):** these are *untrimmed* authored canvas sizes. Measured
trimmed pixel bounds can only be reported once real PixelLab art exists; until
then, set `hitboxScale` against these outer dimensions as a starting point and
expect to revisit once I report real trimmed bounds at import. The only sprite
whose *visible* footprint changes materially from the playtested placeholder is
the **ship (32→40)** — the data-driven `hitboxScale` can hold the effective
hitbox constant against the larger sprite, but the on-screen ship is ~25%
larger, which is a readability improvement worth a sanity check at the next
playtest.

**Frame counts per animation state** (what PixelLab must generate per state):

| entity | fly / idle-loop | second state | notes |
|--------|-----------------|--------------|-------|
| ship             | fly/loop: 4; idle: 2 (optional) | hit-flash: **0 (runtime)** | Ship is always in flight in-game, so `fly/loop` is the only state shown during play; author `idle` (2 calm-hover frames) only if a menu pose is wanted, else reuse fly/loop. |
| `gummy-meteor`   | idle/loop: 4 | hit-flash: **0 (runtime)** | |
| `jawbreaker`     | idle/loop: 4 | hit-flash: **0 (runtime)** | |
| `sour-comet`     | idle/loop: 4 | hit-flash: **0 (runtime)** | Loop = tail flicker/shimmer. |
| `candy-magnet`   | idle/loop: 4 | activate (HUD icon): 1 | HUD icon is a separate single static frame shown while the effect is active — not a world animation. |
| `candy-heart`    | idle/loop: 4 | pickup-burst: **0 (runtime)** | |
| `hop-nebula-dust`| idle/loop: 4 | pickup-sparkle: **0 (runtime)** | |
| `malt-meteorite` | idle/loop: 4 | pickup-sparkle: **0 (runtime)** | |
| `candy-star`     | idle/loop: 4 | pickup-sparkle: **0 (runtime)** | |

- **Loop length = 4 frames** is a soft target: enough for a smooth idle
  spin/pulse at ~8–12 fps playback, cheap to generate. Drop to 2 if generation
  time is tight; the value isn't load-bearing. Frame indices are zero-padded
  two digits (`00`–`03` for a 4-frame loop), matching the naming examples
  below.
- **`hit-flash`, `pickup-sparkle`, `pickup-burst` → 0 authored frames.
  Decided 2026-07-20** (superseding the earlier "recommended, flagged for
  confirmation" note). These are already covered at runtime by the shipped
  `JuiceSystem` (Phase 4): a red one-shot particle burst on hit and a warm
  sparkle burst on candy/power-up pickup (see the "particle burst" tunable in
  `game-design.md`), and hit-flash reads best as a runtime
  `setTintFill(0xffffff)` toggle rather than a baked white frame. PixelLab
  does **not** need to generate these states for MVP — this keeps a single
  consistent particle-effect style across every entity instead of one-off
  custom animations, and trims the art the user must source. A bespoke
  per-entity flash/sparkle remains an option to revisit later (e.g. after a
  playtesting round flags the generic effect as not landing for a specific
  entity) — not required now, and not ruled out permanently.

### Background

- **Two** vertically-scrolling parallax layers (starfield), drawn as Phaser
  `TileSprite`s scrolled at different speeds for depth:
  - **far layer** — sparse, dim, small stars; scrolls slow.
  - **near layer** — fewer, brighter stars / faint nebula wisps; scrolls faster.
- Each layer: **720×960**, authored to tile **seamlessly top-to-bottom** (top
  edge matches bottom edge) so vertical scroll wraps without a seam. Full
  canvas width, 1 frame (static), no animation states.
- Keep both layers **low-contrast and sparse** — the "Visual readability"
  constraint applies here too: gameplay sprites must stay readable against the
  background even on a busy screen. Two layers is the MVP call (enough depth,
  minimal scope); more is easy to add later but not needed now.

**Note on Candy Heart's animation states vs. Candy Magnet's:** the two
power-ups have meaningfully different effect shapes (see `game-design.md`'s
"Power-ups" section — continuous timed vs. one-time instant), and that carries
through to what their sprites need. Candy Magnet stays active for
`durationMs`, so it needs an `activate` HUD-icon variant to show the effect
is ongoing. Candy Heart's effect is instant on pickup with nothing to track
afterward — there's no ongoing state for a HUD icon to represent — so instead
of `activate`, it needs a `pickup-burst` state (a quick flash/burst animation
played once at the moment of pickup, closer to a collectible's
`pickup-sparkle` than to a power-up's `activate`). World-sprite `idle/loop`
is unchanged from the generic power-up convention. This is a naming/asset
implication only; it doesn't change the `PowerUpDef` data shape.

## Hitbox convention

Hitboxes are **data-driven per spawn-table entry**, not per-asset sidecar
files — consistent with the data-driven systems philosophy in
`game-design.md`. Example shape:

```ts
hitboxScale: { w: 0.7, h: 0.6 }  // fraction of trimmed sprite bounds, centered
```

This is what the `sprite-import` skill checks a new export against once
dimensions are known.

## PixelLab export naming convention

- Pattern: `<entity>_<state>_<frameIndex>.png`, kebab-case.
- Examples: `player_fly_00.png`, `gummy-meteor_hit_00.png`,
  `candy-magnet_activate_00.png`.
- Every export batch must be accompanied by an `assets/sprites/manifest.json`
  listing expected entity keys, frame counts per animation state, and
  dimensions — this is the file the `sprite-import` skill validates against.
- **Entity keys** for the 8 named entities are their kebab-case ids exactly
  (`gummy-meteor`, `sour-comet`, `candy-magnet`, …), matching their
  `spriteKey` in `src/game/data/spawnTable.ts`, so imported files bind
  straight to the in-code texture keys.
- **Ship entity key: `player`. Decided 2026-07-20** (superseding the
  2026-07-20 "needs user confirmation" flag). Export the ship as
  `player_<state>_<frameIndex>.png` (e.g. `player_fly_00.png`), matching the
  existing in-code texture key (`PLAYER_TEXTURE_KEY` in
  `src/game/entities/Player.ts`) exactly — no code change, no theme
  commitment. The `astronaut_fly_00.png` example earlier in this doc was
  illustrative only, not a naming decision; that example should be read as
  `player_fly_00.png` going forward.

## Animation states needed (per entity type)

The *conceptual* states are below; see "Pixel dimensions, orientation & frame
counts" above for the concrete per-entity frame counts, including which of
these states are **authored as PixelLab frames** vs. **produced at runtime by
`JuiceSystem`/tint** (hit-flash, pickup-sparkle, pickup-burst → 0 authored
frames, decided 2026-07-20).

- **Player**: idle (optional), fly/loop (authored); hit-flash (runtime tint).
- **Obstacles**: idle/loop (authored); hit-flash (runtime tint).
- **Power-up**: idle/loop world sprite (authored), plus a per-effect-shape
  second state — `activate` HUD icon (authored, 1 frame) for continuous timed
  effects like Candy Magnet, or `pickup-burst` (runtime burst) for one-time
  instant effects like Candy Heart (see the note under "MVP sprite list"
  above).
- **Collectibles**: idle/loop (authored); pickup-sparkle (runtime burst).

## Audio asset sourcing

**Decided 2026-07-15:** [Kenney.nl](https://kenney.nl) pre-made, CC0-licensed
sound packs — see the audio spec in `docs/game-design.md` for the track/cue
list this needs to cover (one looping background track, plus SFX for candy
pickup/obstacle hit/power-up activate/game over/UI click).

- **Licensing**: CC0 (public domain) — no attribution required for any clip
  sourced from Kenney.nl packs.
- **Selection is still manual**: picking the specific pack(s) and clip(s) per
  cue requires human listening to judge audio quality/fit — this isn't
  something that can be resolved programmatically. Browse relevant Kenney.nl
  packs and pick clips matching each cue in the track/cue list above.
