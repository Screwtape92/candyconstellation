# Candy Constellation: Space Dodger

An endless vertical space-dodger built for AgileBridge's company birthday
beerfest — an astronaut auto-flies through a candy-asteroid field, dodging
obstacles and collecting candy ingredients to brew the beer, with a health
bar and power-ups rather than instant death.

## Stack

Vite + React + TypeScript + Phaser 3 + Tailwind (frontend); Azure Static Web
Apps + Functions + Table Storage (backend); Entra ID multi-tenant sign-in.

## Scope

Desktop web only — 960×540 landscape canvas, keyboard/mouse input. No
mobile/touch support.

## Ground truth docs

Read these before making design/architecture/asset decisions:

- `docs/game-design.md` — state machine, difficulty curve, health/power-up/
  spawn systems, scoring, anti-cheat, audio spec.
- `docs/architecture.md` — frontend/backend structure, Table Storage schema,
  auth flow, score-submission resilience, performance budget.
- `docs/asset-spec.md` — sprite list, canvas/hitbox conventions, naming
  convention, animation states.
- `docs/planning-log.md` — the *why* behind the above. It's a reasoning
  trail, not the source of truth for current behavior — if it conflicts with
  one of the docs above, the doc wins, but flag the conflict.

## Data-driven systems

Health, power-ups, and spawning are generic, table-driven systems (see
`docs/game-design.md`). Adding content beyond the MVP set is adding rows to
`src/game/data/*.ts`, not a code change.

## Content naming — always confirm with the user first

Obstacle/power-up/collectible names and theme are **not decided yet** and are
marked TBD throughout the docs above. Don't invent or finalize candy/ingredient
names, lore, or other creative content — ask the user before writing it into
a doc or into code.

## Subagents (`.claude/agents/`)

- `game-designer` — gameplay design/tuning changes → `docs/game-design.md`.
- `sprite-integrator` — importing/wiring PixelLab sprites → `docs/asset-spec.md`,
  uses the `sprite-import` skill.
- `azure-infra` — Functions/Table Storage/Entra/deployment → `docs/architecture.md`.
- `qa-tester` — gameplay/perf/auth-flow/anti-cheat verification.

## Skills (`.claude/skills/`)

- `sprite-import` — validates PixelLab exports against `docs/asset-spec.md`
  before wiring them into the game.
