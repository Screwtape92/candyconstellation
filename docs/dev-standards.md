# Dev Standards — Candy Constellation: Space Dodger

Code/test/git conventions for this project. See `docs/planning-signoff.md`
for review status of every item below.

**Scope note:** this is a short-lived event game, not a long-lived product —
these conventions are deliberately lightweight. Don't add process beyond what's
below without a reason; more ceremony than the project needs slows down
actually building the game.

## Code quality & tooling

- ESLint + Prettier configured from the first commit — not bolted on after
  style has already drifted across files written by different agents.
- TypeScript `strict: true`.
- Comment convention: none by default. Only add a comment when it captures a
  non-obvious *why* (a workaround, a subtle invariant) — never restate what
  well-named code already shows. This matches the style already used across
  `docs/`.
- No god-files: the data-driven systems in `docs/game-design.md` are the
  guardrail here — new content is a row in `src/game/data/*.ts`, not a special
  case bolted onto a system. If an agent finds itself branching on a specific
  obstacle/power-up ID inside systems code, that's a sign the data-driven
  shape is being bypassed, not a one-off exception.
- Naming/folder conventions for game code follow the structure already fixed
  in `docs/architecture.md`; PixelLab asset naming follows `docs/asset-spec.md`.
  This doc doesn't repeat those.
- **Clean Code**: follow Robert C. Martin's Clean Code principles — single
  responsibility, DRY, meaningful naming, small functions, proper error
  handling, clear boundaries between modules, no dead code. This isn't left
  to individual judgment: the `code-reviewer` subagent (see `CLAUDE.md`)
  checks changes against this using the `clean-code-review` skill, plus
  general correctness/simplification via the `code-review` skill.
  **Exception**: the generic data-driven health/power-up/spawn systems in
  `docs/game-design.md` are deliberately built ahead of MVP content need —
  that's a decision already made in `docs/planning-log.md`, not premature
  abstraction. `code-reviewer` shouldn't flag it as a Clean Code violation.

## Testing

- Unit tests for logic where a subtle bug is both easy to introduce and
  security/integrity-relevant, not eyeballable from a playtest:
  - The anti-cheat plausibility formula (`docs/game-design.md`).
  - The scoring formula.
  - The insert-only score submission logic, including retry-safe
    `submissionGuid` collision handling (a retried submission hitting the
    same `RowKey` is treated as success, not a duplicate) (`docs/architecture.md`).
- Everything else (game feel, rendering, state-machine transitions, perf
  budget) is verified by the `qa-tester` agent playing against the specs, not
  by an automated test suite — not worth the overhead at this project's size.
- **Definition of done** for a feature: matches its spec in the relevant
  ground-truth doc, holds the performance budget, checked off by `qa-tester`
  for behavior, and checked off by `code-reviewer` for Clean Code/correctness
  — not just "code compiles and looks right."

## Git workflow

- Trunk-based: commit directly to `main` after reviewing the diff yourself;
  no long-lived feature branches. A PR-per-feature workflow is more ceremony
  than a solo-plus-agents project at this scale needs.
- Commit messages: short imperative subject line; body only when the *why*
  isn't obvious from the diff (mirrors the no-comments-unless-non-obvious
  rule above).

## CI / deploy

- Azure Static Web Apps auto-wires a GitHub Actions deploy on push to `main`
  once the SWA resource is connected to the repo.
- **Decided 2026-07-15**: `main` auto-deploys continuously from the first
  push, no manual gate. A manual gate (separate branch, environment
  protection/approval step) would be real added ceremony this project's scope
  doesn't need — the SWA URL isn't advertised anywhere until deliberately
  shared near/at the 2026-09-11 event, so the practical risk of someone
  stumbling onto a broken build is low. Revisit only if that changes (e.g. the
  URL gets shared early for some reason).

## Local dev setup

TBD — to be filled in once the project is scaffolded (no `package.json` exists
yet). Placeholder, not blocking planning sign-off.
