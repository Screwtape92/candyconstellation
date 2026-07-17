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

- 960×540, landscape, fixed aspect ratio (desktop web only — no
  portrait/mobile sizing).
- Pixel-art scale factor: not decided yet — deferred by design, not an open
  gap. **Decided 2026-07-15:** owned by `sprite-integrator`, to be set at
  Phase 7 (`docs/build-plan.md`'s "Real assets" phase) kickoff, once real
  PixelLab sourcing actually begins, rather than picking a number now.

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

Pixel dimensions per sprite: TBD, decided alongside the scale factor above —
same ownership/timing resolution: `sprite-integrator`, at Phase 7 kickoff.

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
- Examples: `astronaut_fly_00.png`, `gummy-meteor_hit_00.png`,
  `candy-magnet_activate_00.png`.
- Every export batch must be accompanied by an `assets/sprites/manifest.json`
  listing expected entity keys, frame counts per animation state, and
  dimensions — this is the file the `sprite-import` skill validates against.

## Animation states needed (per entity type)

- **Player**: idle, fly/loop, hit-flash.
- **Obstacles**: idle/loop, hit-flash.
- **Power-up**: idle/loop (world sprite), plus a per-effect-shape second
  state — `activate` (HUD icon variant) for continuous timed effects like
  Candy Magnet, or `pickup-burst` for one-time instant effects like Candy
  Heart (see the note under "MVP sprite list" above).
- **Collectibles**: idle/loop, pickup-sparkle.

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
