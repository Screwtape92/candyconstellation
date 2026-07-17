# Build Plan — Candy Constellation: Space Dodger

The other docs describe the finished, steady-state system. This doc is the
*order* to build it in — chosen to de-risk the biggest unknown first and
avoid building each layer on top of one that hasn't been verified yet. See
`docs/planning-signoff.md` for review/approval status of this phase order.

Each phase names the subagent(s) that own its work (see `CLAUDE.md`) and an
exit condition — what has to be true before moving to the next phase, per the
Definition of Done in `docs/dev-standards.md`.

## Phase 1 — Scaffold

- Vite + React + TS + Phaser 3 + Tailwind project setup; ESLint/Prettier/TS
  strict config from `docs/dev-standards.md`.
- No auth de-risk spike needed — see `docs/planning-log.md`: Entra ID sign-in
  was dropped (2026-07-15) in favor of free-text name entry, which removed
  the project's single biggest risk item along with the need to test it
  first.
- **Owner**: general scaffolding, no subagent-specific work.
- **Exit condition**: project scaffolding builds and runs with lint/format/TS
  strict checks passing.

## Phase 2 — Core vertical slice

- Player movement/controls, one obstacle, collision, health, game over. No
  power-ups, scoring, or backend yet.
- **Owner**: `game-designer`.
- **Exit condition**: it's playable and dodging something feels reasonable —
  the fastest possible answer to "is the core loop fun," before investing in
  anything built on top of it.

## Phase 3 — Data-driven systems + MVP content

- Power-up system, spawn table wired up with the MVP rows, difficulty
  curve/tiers, scoring — per `docs/game-design.md`.
- **Owner**: `game-designer`.
- **Exit condition**: matches the systems spec in `docs/game-design.md`;
  MVP content rows in place using the real, already-approved names (Gummy
  Meteor, Jawbreaker, Sour Comet, Candy Magnet, Candy Heart, Hop Nebula Dust,
  Malt Meteorite, Candy Star — naming session already happened 2026-07-15).

## Phase 4 — Feel & experience pass + first playtesting round

- Juice (hit-stop, screen shake, particle bursts), onboarding/first-10-seconds
  teaching, difficulty floor for first-time players — per the "Feel &
  experience" section of `docs/game-design.md`.
- First real playtesting round against the loop in `docs/dev-standards.md`'s
  testing section.
- **Owner**: `game-designer`, `qa-tester`.
- **Exit condition**: playtesters (not just the developer) find the opening
  seconds teachable and the core loop enjoyable; tunable constants have real
  first values instead of placeholders.

## Phase 5 — Backend

- Azure Static Web App + Functions + Table Storage, `submitScore`/
  `getLeaderboard`, anti-cheat check — per `docs/architecture.md`.
- **Owner**: `azure-infra`.
- **Exit condition**: matches the Table Storage schema and anti-cheat formula
  in the specs; runs independent of the frontend (testable via direct calls)
  before wiring it into the UI.

## Phase 6 — Score submission + resilience

- Free-text name entry on game over; fire-and-forget score submission with
  the localStorage retry queue; leaderboard polling UI. No sign-in step.
- **Owner**: `azure-infra`.
- **Exit condition**: a full run — play, game over, enter name, score
  submitted, leaderboard updates — works end-to-end, including a simulated
  dropped connection at submission time.

## Phase 7 — Real assets

- PixelLab sprite/audio exports replacing placeholders, via
  `sprite-integrator` and the `sprite-import` skill — per `docs/asset-spec.md`.
- Content naming is already resolved (2026-07-15, see `docs/game-design.md`
  and `docs/asset-spec.md`) — real sprites can be sourced/named against the
  actual entities from day one of this phase, no longer a blocker.
- **Owner**: `sprite-integrator`.
- **Exit condition**: every MVP entity has a validated sprite/animation set
  wired in; visual readability holds per the Feel & experience section.

## Phase 8 — Launch readiness

- Verify the already-decided runtime settings actually hold up in practice:
  `Phaser.Scale.FIT` display/scaling, `Phaser.AUTO` renderer, restart cleanup
  under repeated play, the ~5s initial load-time budget, debug tooling
  stripped from the production build — per `docs/architecture.md`'s Runtime
  concerns. Confirm the continuous-auto-deploy CI/deploy approach (already
  decided in `docs/dev-standards.md`) is actually wired up and working, not a
  decision still to make.
- Renamed 2026-07-15 from "Kiosk readiness" — this project has no physical
  venue/kiosk (standalone public web link, anyone plays anytime on their own
  device), so this phase is about the game holding up for any individual
  player across repeated plays, not an in-person event.
- **Owner**: `azure-infra` (deploy/CI), `game-designer` (runtime/engine
  concerns).
- **Exit condition**: the game survives many consecutive plays back-to-back
  in the same browser tab without degrading (leaked timers/listeners/pooled
  objects compounding across restarts), across the runtime settings already
  decided — not tied to any particular venue or display setup, since there
  isn't one.

## Phase 9 — Playtesting & tuning rounds, then freeze

- Iterate tunable constants against real playtesters; final `qa-tester` pass
  against every spec in `docs/game-design.md` and `docs/architecture.md`;
  deploy freeze before **2026-09-11** (beerfest date).
- **Owner**: `qa-tester`, `game-designer`.
- **Exit condition**: all `planning-signoff.md` items are checked off, all
  specs verified by `qa-tester`, and the build running at the frozen `main`
  is the one that goes live at the event.
