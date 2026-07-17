# Build Plan — Candy Constellation: Space Dodger

The other docs describe the finished, steady-state system. This doc is the
*order* to build it in — chosen to de-risk the biggest unknown first and
avoid building each layer on top of one that hasn't been verified yet. See
`docs/planning-signoff.md` for review/approval status of this phase order.

Each phase names the subagent(s) that own its work (see `CLAUDE.md`) and an
exit condition — what has to be true before moving to the next phase, per the
Definition of Done in `docs/dev-standards.md`.

**Progress tracking (added 2026-07-15):** each phase has a checklist of its
own sub-steps instead of a free-text status — check items off (`[x]`) as they
land, rather than writing a prose summary each time. **These checklists are a
starting sketch, not a fixed breakdown** — derived from each phase's existing
scope description, not a binding decomposition. Whoever actually works a
phase should freely add, merge, or re-split its items to match how the work
really gets broken into subagent tasks at the time (per `CLAUDE.md`'s task
granularity rule) — don't force real work to fit boxes guessed at during
planning. Whoever is actually working a phase (any session, any team member)
keeps the checklist current and commits it, the same as any other decision
in this repo — don't leave progress recorded only in chat history or a local
task list, since neither survives a killed session or is visible to anyone
else. A fresh session (local or cloud, yours or a teammate's) should read
this file to see exactly where the build stands before doing anything else,
and cross-check against `git log` if a checklist looks stale.

**Overall progress**: 0/9 phases done · ~8 weeks (58 days) to **2026-09-11**
— update the phase count here as phases are fully checked off, so it's a
one-glance answer to "are we on pace."

## Phase 1 — Scaffold

- [x] Vite + React + TS + Phaser 4 + Tailwind project setup (installed
      version resolved to Phaser ^4.2.1, not 3 as originally planned — see
      `docs/architecture.md`'s Stack section)
- [x] ESLint/Prettier/TS strict config from `docs/dev-standards.md`
- [ ] One-time early smoke-deploy: create the real Azure Static Web App
      resource and confirm GitHub Actions auto-deploys this scaffold to it
      successfully, then go back to local-first development for everything
      else through Phase 7. Added 2026-07-15 — de-risks the CI/deploy
      pipeline itself early (same "surface the biggest unknown first"
      reasoning that originally put the now-dropped Entra spike first in this
      order), rather than discovering a pipeline surprise for the first time
      in Phase 8 with little runway left.
      **Deferred 2026-07-17**: rest of scaffold (tooling/build/lint/format)
      is done and committed; this step is on hold until a proper Azure
      subscription is set up — the CLI here was logged into an unrelated
      "Auxcon Production" tenant, not one this project should deploy into.
      Not a blocker for Phase 2+ local-first work.
- No auth de-risk spike needed — see `docs/planning-log.md`: Entra ID sign-in
  was dropped (2026-07-15) in favor of free-text name entry, which removed
  the project's single biggest risk item along with the need to test it
  first.
- **Owner**: general scaffolding, no subagent-specific work.
- **Exit condition**: project scaffolding builds and runs with lint/format/TS
  strict checks passing; the smoke-deploy is confirmed live at the SWA URL.

## Phase 2 — Core vertical slice

- [ ] Player movement/controls (arrows + WASD, full 4-directional)
- [ ] One obstacle + collision
- [ ] Health system (damage, invuln window, health<=0 → GameOver)
- [ ] Game over flow

No power-ups, scoring, or backend yet.
- **Owner**: `game-designer`.
- **Exit condition**: it's playable and dodging something feels reasonable —
  the fastest possible answer to "is the core loop fun," before investing in
  anything built on top of it.

## Phase 3 — Data-driven systems + MVP content

- [ ] Power-up system (Candy Magnet, Candy Heart)
- [ ] Spawn table wired with MVP rows (Gummy Meteor, Jawbreaker, Sour Comet,
      Hop Nebula Dust, Malt Meteorite, Candy Star)
- [ ] Difficulty curve/tiers (decaying-rate, no hard cap)
- [ ] Scoring formula

Per `docs/game-design.md`.
- **Owner**: `game-designer`.
- **Exit condition**: matches the systems spec in `docs/game-design.md`;
  MVP content rows in place using the real, already-approved names (Gummy
  Meteor, Jawbreaker, Sour Comet, Candy Magnet, Candy Heart, Hop Nebula Dust,
  Malt Meteorite, Candy Star — naming session already happened 2026-07-15).

## Phase 4 — Feel & experience pass + first playtesting round

- [ ] Juice (hit-stop, screen shake, particle bursts)
- [ ] Onboarding / first-10-seconds teaching
- [ ] Difficulty floor for first-time players
- [ ] First playtesting round (3-5 fresh colleagues, individual/unaided —
      see `docs/game-design.md`'s Playtesting loop plan)

Per the "Feel & experience" section of `docs/game-design.md`.
- **Owner**: `game-designer`, `qa-tester`.
- **Exit condition**: playtesters (not just the developer) find the opening
  seconds teachable and the core loop enjoyable; tunable constants have real
  first values instead of placeholders.

## Phase 5 — Backend

- [ ] Azure Static Web App + Functions scaffolding
- [ ] Table Storage (`Scores`, `RateLimits` tables)
- [ ] `submitScore` endpoint (insert-only, input validation, rate-limiting,
      anti-cheat check)
- [ ] `getLeaderboard` endpoint

Per `docs/architecture.md`. **Build and test this locally, not against real
Azure** (added 2026-07-15): Azure Functions Core Tools (`func start`) runs
the Functions runtime locally, and Azurite emulates Table Storage — the
`Scores`/`RateLimits` logic (insert-only writes, the `RowKey` sort trick,
rate-limiting) can be fully built and verified against these with zero real
cloud resource. The one real Azure resource created is the Phase 1
smoke-deploy — no need to touch it again until Phase 8.
- **Owner**: `azure-infra`.
- **Exit condition**: matches the Table Storage schema and anti-cheat formula
  in the specs; runs independent of the frontend (testable via direct calls)
  before wiring it into the UI.

## Phase 6 — Score submission + resilience

- [ ] Free-text name entry on game over
- [ ] Fire-and-forget score submission
- [ ] `localStorage` retry queue (retry-safe via shared `submissionGuid`)
- [ ] Leaderboard polling UI

No sign-in step. Also local-first, same as Phase 5 — the "simulated dropped
connection" test can be done by killing the local dev server mid-request,
no real Azure needed.
- **Owner**: `azure-infra`.
- **Exit condition**: a full run — play, game over, enter name, score
  submitted, leaderboard updates — works end-to-end, including a simulated
  dropped connection at submission time.

## Phase 7 — Real assets

- [ ] Obstacle sprites (Gummy Meteor, Jawbreaker, Sour Comet)
- [ ] Power-up sprites (Candy Magnet, Candy Heart)
- [ ] Collectible sprites (Hop Nebula Dust, Malt Meteorite, Candy Star)
- [ ] Player + background sprites
- [ ] Audio (Kenney.nl CC0 packs — background loop + 5 SFX cues)

Via `sprite-integrator` and the `sprite-import` skill, per
`docs/asset-spec.md`. Content naming is already resolved (2026-07-15) — real
sprites can be sourced/named against the actual entities from day one of
this phase, no longer a blocker.
- **Owner**: `sprite-integrator`.
- **Exit condition**: every MVP entity has a validated sprite/animation set
  wired in; visual readability holds per the Feel & experience section.

## Phase 8 — Launch readiness

- [ ] Display/scaling mode verified (`Phaser.Scale.FIT`)
- [ ] Renderer mode verified (`Phaser.AUTO`)
- [ ] Restart cleanup verified under repeated play (same tab, many runs)
- [ ] Initial load-time budget verified (~5s on typical broadband)
- [ ] Debug tooling stripped from the production build
- [ ] Continuous auto-deploy CI/deploy confirmed actually wired up and working

Per `docs/architecture.md`'s Runtime concerns and `docs/dev-standards.md`'s
CI/deploy section — these are all already-decided settings to *verify*, not
decisions still to make. This is the point real Azure deployment resumes in
earnest (Phases 5-7 were local-first) — but the pipeline itself was already
smoke-tested in Phase 1, so this should mostly be confirming things still
work with real content/code, not discovering the pipeline for the first time.
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

- [ ] Wider playtesting round (8-10+ people, varied familiarity, repeat-replay
      stress test — see `docs/game-design.md`'s Playtesting loop plan)
- [ ] Tunable constants set to real final values from playtesting feedback
- [ ] Final `qa-tester` pass against `docs/game-design.md`
- [ ] Final `qa-tester` pass against `docs/architecture.md`
- [ ] Final pre-freeze smoke-test on the frozen build
- [ ] Deploy freeze before **2026-09-11** (beerfest date)
- **Owner**: `qa-tester`, `game-designer`.
- **Exit condition**: all `planning-signoff.md` items are checked off, all
  specs verified by `qa-tester`, and the build running at the frozen `main`
  is the one that goes live at the event.
