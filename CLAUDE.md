# Candy Constellation: Space Dodger

An endless vertical space-dodger built for AgileBridge's company birthday
beerfest — an astronaut auto-flies through a candy-asteroid field, dodging
obstacles and collecting candy ingredients to brew the beer, with a health
bar and power-ups rather than instant death.

## Stack

Vite + React + TypeScript + Phaser 4 + Tailwind (frontend); Azure Static Web
Apps + Functions + Table Storage (backend); no sign-in — free-text name entry
for high scores, classic-arcade style.

## Scope

Desktop web only — 720×960 portrait canvas, keyboard/mouse input. No
mobile/touch support. (Corrected 2026-07-17 from an originally-planned
960×540 landscape canvas — see `docs/architecture.md`'s Platform section.)

## Ground truth docs

Read these before making design/architecture/asset decisions:

- `docs/game-design.md` — state machine, difficulty curve, health/power-up/
  spawn systems, scoring, anti-cheat, audio spec.
- `docs/architecture.md` — frontend/backend structure, Table Storage schema,
  auth flow, score-submission resilience, performance budget.
- `docs/asset-spec.md` — sprite list, canvas/hitbox conventions, naming
  convention, animation states.
- `docs/planning-signoff.md` — tracks user review/approval status of every
  decision in the docs above, plus open gaps not yet covered by any doc.
  **Planning is signed off (2026-07-15)** — all sections approved, all open
  gaps resolved. Implementation work (per `docs/build-plan.md`'s phases) can
  now proceed.
- `docs/planning-log.md` — the *why* behind the above. It's a reasoning
  trail, not the source of truth for current behavior — if it conflicts with
  one of the docs above, the doc wins, but flag the conflict.
- `docs/dev-standards.md` — code quality, testing, git, and CI/deploy
  conventions for this repo.
- `docs/build-plan.md` — the phased implementation order (what gets built
  before what, and why), distinct from the steady-state specs above.

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
- `azure-infra` — Functions/Table Storage/deployment → `docs/architecture.md`.
- `qa-tester` — gameplay/perf/score-submission/anti-cheat/rate-limiting verification.
- `code-reviewer` — code review only (Clean Code, correctness, simplification)
  → `docs/dev-standards.md`. Doesn't implement or verify runtime behavior.

## Skills (`.claude/skills/`)

- `sprite-import` — validates PixelLab exports against `docs/asset-spec.md`
  before wiring them into the game.

## Agent collaboration rules

Shared rules for all subagents, in addition to what's in each individual
brief:

- **Escalate, don't improvise.** If a task would deviate from a decision
  recorded in `docs/planning-log.md` (genre, stack, platform, no-auth/
  insert-only leaderboard model), or requires inventing content marked TBD
  (obstacle/power-up/collectible names, lore), stop and ask the user rather
  than proceeding on a guess. Each agent brief repeats this for its own
  domain; this is the general form.
- **Handoff rule for cross-domain tasks.** The agent that owns the target
  file makes the edit; an agent whose domain is only *relevant* to that edit
  supplies that information as a note, not a direct edit to a file it doesn't
  own. Concrete example of this rule applied (resolved 2026-07-15): spawn-table
  `hitboxScale` values live in `docs/game-design.md`, so `game-designer` always
  makes the actual edit; `sprite-integrator` supplies the sprite's measured
  trimmed pixel bounds as a note when it imports/updates an asset, rather than
  editing `game-design.md` itself.
- **State lives in the repo, not the transcript.** Every agent task ends with
  the relevant ground-truth doc updated (if a decision changed) and a commit
  — never leave a decision recorded only in chat history. `docs/planning-log.md`
  documents why this matters: cloud sessions and future local sessions only
  see what's actually committed.
- **Autonomy ramps up with trust, not by default.** Until an agent's output
  has been reviewed a few times, run it in a mode that surfaces each change
  for review rather than auto-applying edits. Loosen this per-agent once its
  output has proven reliable, not upfront for all four at once.
- **How uncertainty surfaces mid-task.** A subagent can't pause mid-task and
  wait for a live reply — it runs and returns one result. So "escalate,
  don't improvise" means: when a subagent hits a genuine uncertainty, it
  should **stop and return the question as its result instead of guessing
  and continuing**. The orchestrating session relays that question to the
  user, and once answered, **resumes the same agent** (not a fresh one) so
  it continues with full context rather than redoing work.
- **Keep tasks small enough to create real checkpoints.** A subagent only
  gets a chance to surface something at the point it returns, so handing it
  an entire `docs/build-plan.md` phase as one task means nothing surfaces
  until the whole thing is done. Especially while trust is still being
  established per agent, break phases into smaller steps (e.g. movement,
  then collision, then health, as separate tasks within Phase 2) so there
  are frequent points for the user to react, rather than one large task that
  only reveals problems at the end.
- **Review agents are a second, independent check — not a duplicate of the
  first.** `qa-tester` and `code-reviewer` exist to catch what the
  implementing agent didn't think to flag itself, not to re-confirm what it
  already said. Per `docs/dev-standards.md`'s Definition of Done, a feature
  isn't done just because the implementing agent says so.
