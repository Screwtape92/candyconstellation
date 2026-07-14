---
name: sprite-import
description: Validate a batch of PixelLab sprite exports against docs/asset-spec.md (naming, frame counts, manifest consistency) before wiring them into the game. Docs-only checklist — no bundled script yet.
---

# Sprite Import Validation

Use this skill whenever new PixelLab exports need to be checked before
wiring into the game (typically from the `sprite-integrator` agent). Ground
truth: `docs/asset-spec.md`.

This is a manual checklist for this phase of the project — no validation
script is bundled yet (Phase 0 was scoped as documentation/scaffolding only).
A script can be added once real sprite work starts and there's a concrete
manifest format to validate against.

## Checklist

1. **Read `docs/asset-spec.md`** for the current MVP sprite list, canvas
   size, and naming convention.
2. **Naming**: every file matches `<entity>_<state>_<frameIndex>.png`,
   kebab-case (e.g. `astronaut_fly_00.png`). Flag any file that doesn't.
3. **Entity coverage**: every entity role listed in `docs/asset-spec.md`'s
   MVP sprite list has exports for each of its required animation states
   (e.g. player needs idle, fly/loop, hit-flash).
4. **Manifest consistency**: `assets/sprites/manifest.json` lists the same
   entity keys, frame counts per state, and dimensions as the actual export
   batch — no entity or frame present in one but not the other.
5. **Hitbox readiness**: confirm the entity has (or will get) a
   `hitboxScale` entry in its spawn-table row per the data-driven convention
   in `docs/asset-spec.md` — not a separate per-asset hitbox file.
6. **Report**: a pass/fail line per asset, listing any naming, coverage, or
   manifest mismatches found. Don't silently fix mismatches — report them so
   the source (PixelLab export or manifest) can be corrected upstream.

## Out of scope for this checklist

- Actually measuring PNG pixel dimensions or transparent-padding/trim bounds
  — that requires inspecting binary image data, which isn't possible with
  Read alone. Note any such check as "unverified, needs a script" in the
  report rather than guessing.
- Naming/theming new entities — that's a design decision, not a validation
  task; see `CLAUDE.md`'s content-naming instruction.
