# Asset Spec — Candy Constellation: Space Dodger

See `docs/planning-log.md` for context and `docs/game-design.md` for the
spawn-table entries these assets back. This doc is the current-state spec —
update it whenever an asset decision changes.

> **Names/theme are placeholders.** As in `game-design.md`, none of the
> obstacle/power-up/collectible identities are finalized — confirm with the
> user before naming or theming any sprite.

## Canvas

- 960×540, landscape, fixed aspect ratio (desktop web only — no
  portrait/mobile sizing).
- Pixel-art scale factor: TBD, decide once a target sprite resolution is
  chosen (see "MVP sprite list" below).

## MVP sprite list

Mirrors the spawn-table rows in `docs/game-design.md`; roles are fixed, names
are not:

| role            | maps to (game-design)      | animation states needed                  |
|-----------------|------------------------------|--------------------------------------------|
| ship            | player                       | idle, fly/loop, hit-flash                   |
| `obstacle-a`    | spawn table `obstacle-a`     | idle/loop, hit-flash (on collision)         |
| `obstacle-b`    | spawn table `obstacle-b` (optional 2nd) | idle/loop, hit-flash             |
| `power-up-1`    | spawn table `power-up-1`     | idle/loop (world sprite), activate (HUD icon)|
| `collectible-1` | spawn table `collectible-1`  | idle/loop, pickup-sparkle                   |
| background      | —                            | vertically tileable, parallax layers        |

Pixel dimensions per sprite: TBD, decide alongside the scale factor above —
not blocking for this planning pass.

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
- Examples: `astronaut_fly_00.png`, `obstacle-a_hit_00.png`,
  `power-up-1_activate_00.png`.
- Every export batch must be accompanied by an `assets/sprites/manifest.json`
  listing expected entity keys, frame counts per animation state, and
  dimensions — this is the file the `sprite-import` skill validates against.

## Animation states needed (per entity type)

- **Player**: idle, fly/loop, hit-flash.
- **Obstacles**: idle/loop, hit-flash.
- **Power-up**: idle/loop (world sprite), activate (HUD icon variant).
- **Collectibles**: idle/loop, pickup-sparkle.

## Audio asset sourcing

Not yet decided (freesound/purchased/AI-generated) — see the audio spec in
`docs/game-design.md` for the track/cue list this needs to cover. Licensing
notes to be added here once a source is chosen.
