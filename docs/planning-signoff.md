# Planning Sign-Off — Candy Constellation: Space Dodger

This is the working checklist for closing out the planning phase. The docs
(`game-design.md`, `architecture.md`, `asset-spec.md`, `planning-log.md`) were
produced by a previous session and haven't been reviewed by the user yet.
Nothing here overrides those docs — this tracks *review status*, not new
decisions. When an item is approved here, the underlying doc is the source of
truth for its content; this file just proves it was looked at.

## How to use this doc

- Review one section at a time, in the order below (each builds on the last).
- For each row, change Status to **Approved** once you're satisfied, or
  **Needs revision** with a note on what has to change. Leave **Not reviewed**
  otherwise.
- Don't blanket-approve a whole doc in one go — call out each item so gaps
  don't hide behind an approved doc.
- The **Open gaps** section holds things that aren't in any doc yet and need
  a decision, not just a review — resolve those before final sign-off.
- Planning phase is "done" when every item below is Approved and every open
  gap is resolved or explicitly deferred with a reason.

Status legend: 🔲 Not reviewed · ✅ Approved · ⚠️ Needs revision

## Review methodology

This checklist is meant to be worked through **interactively, in conversation
with the user** — not read silently and reported back on. The point of the
review is to catch things that don't hold up once someone actually questions
them; a silent read of ~70 rows tends to become skimming-and-approving
instead.

Process for whoever (which agent/session) is running the review:

1. Go doc-by-doc, in the section order below — don't jump ahead to a later
   section until the current one is resolved.
2. **Every item in every section must actually be shown to the user — never
   silently pre-filtered, skipped, or assumed.** It is fine to propose
   grouping several items into one batch for faster approval when they look
   uncontroversial, but that's strictly a speed convenience for *how* approval
   is requested — it must never reduce what the user actually sees. The
   reviewer doesn't get to decide something counts as "obviously fine" on the
   user's behalf; the user decides that, and can always pull any item back
   out of a proposed batch for individual scrutiny. (This was an explicit
   correction from the user during the 2026-07-15 session — don't regress on
   it.)
3. Update this file's Status column live, during the conversation, as each
   item/batch is actually resolved — don't reconcile it from memory after the
   fact.
4. Only move to the next section once the current one's flagged items are
   resolved.

---

## 1. `planning-log.md` — decision rationale

| Item | Status | Notes |
|---|---|---|
| Genre: endless vertical dodger, health bar not instant-death | ✅ | Approved 2026-07-15 — `planning-log.md` fleshed out with the real "why" (build-speed/LLM-precedent choice, Candy Constellation theme tie-in) and scope framing (short-lived hype piece for beerfest, not a long-running product). |
| Stack: Vite + React + TS + Phaser 4 + Tailwind | ✅ | Approved 2026-07-15 — Phaser is right-sized for this genre, React-as-shell + Vite/TS/Tailwind all hold up. One risk noted for later: React 18 StrictMode double-mount gotcha with the Phaser instance. Corrected 2026-07-17: planning targeted Phaser 3, but Phase 1 scaffolding installed ^4.2.1 (latest at the time); Phase 2.1 confirmed the APIs used work fine on 4, so the doc was updated rather than pinning back to 3 — see `architecture.md`. |
| Backend: Azure (SWA + Functions + Table Storage), not Supabase | ✅ | Approved 2026-07-15 — Functions is the right compute layer given native SWA integration + consumption-plan pricing matches the actual (low) usage pattern. Table Storage ORDER BY limitation already addressed in `architecture.md`'s insert-only schema rework. |
| Platform: desktop web only, no mobile/touch | ✅ | Approved 2026-07-15 — reaffirmed after the access-model correction (standalone link, anyone/anytime, not a kiosk): mobile stays out of scope given touch-control clunkiness. Anticipated "people want to play" demand is a non-issue since there's no venue/queue to solve for. See `planning-log.md`. Corrected 2026-07-17: canvas switched from 960×540 landscape to 720×960 portrait — landscape had wrongly followed from "not mobile" when the two are independent; playtesting the Phase 2.2 slice showed it wasted horizontal space and starved the vertical-dodger genre of player-reaction travel distance. Still desktop/keyboard-only, no mobile scope reintroduced. |
| ~~Auth: Entra ID multi-tenant, under user's own subscription, low-priv scopes~~ | ✅ | **Superseded 2026-07-15**, decided interactively: dropped Entra entirely in favor of free-text name entry (classic arcade style), insert-only leaderboard (no dedup — same name can appear multiple times). See `planning-log.md`. |
| ~~Known risk: tenant consent lock-out (`AADSTS65001`), sign-in test-first plan~~ | — | Moot — no longer applicable now that Entra is dropped. |
| Generic data-driven health/power-up/spawn systems from day one | ✅ | Approved 2026-07-15 — clarified motivation in `planning-log.md`: this is deadline de-risking (get a minimal core playable first, add more content later only if time allows before 2026-09-11), not future-growth scaling. **Note for Section 2**: keep the actual systems spec (stacking modes, tier-gating shape) only as general as the real MVP content needs — don't over-spec for hypothetical future content. |
| Full design-planning checklist approach (vs. just bounding boxes) | ✅ | Approved 2026-07-15. |
| Agentic structure: CLAUDE.md + 5 subagents + 1 skill, no workflow orchestration | ✅ | Approved 2026-07-15 — corrected from "4 subagents" to 5 (`code-reviewer` was added after the original decision, see `planning-log.md`). Stale Entra/auth references in `azure-infra.md` and `qa-tester.md` fixed to match the no-auth/insert-only model. |
| Repo cleanup (nested-repo fix) — informational only, no action needed | ✅ | Approved 2026-07-15 — verified: no stray `.git` in the parent `Beerfest` folder, `candyconstellation` is the sole repo root. |

## 2. `game-design.md` — gameplay spec

| Item | Status | Notes |
|---|---|---|
| Game state machine (React shell ⇄ Phaser scenes split) | ✅ | Approved 2026-07-15. |
| Difficulty curve: continuously increasing, decaying rate, no hard cap (spawn interval, obstacle speed) + capped tier gate | ✅ | Approved/redesigned 2026-07-15 — was originally a hard-capped ramp-to-plateau; changed to `sqrt(t)`-shaped growth (spawn interval shrinks, obstacle speed grows) with no floor/ceiling, so no run can be cruised indefinitely at a fixed max difficulty. Discrete content-tier gate (`maxTier`) intentionally left capped — separate concern (content variety, not moment-to-moment challenge). Anti-cheat's `maxCandyRatePerSec` reasoning updated to match. |
| Health system shape (damage, invuln window, health<=0 → GameOver) | ✅ | Approved 2026-07-15. |
| Power-up system shape (generic timed-effect interface, stacking modes) | ✅ | Approved 2026-07-15. |
| Spawn table shape (weighted, tier-gated, generic across obstacle/collectible/powerup) | ✅ | Approved 2026-07-15. |
| MVP content scope: 3 obstacles, 2 power-ups, 3 collectibles | ✅ | Approved 2026-07-15 — collectible count expanded 1→3, obstacle count 2→3, and power-up count 1→2 (Candy Heart added, a low-cost instant health-restore effect) at the user's explicit choice. A "Black Hole" obstacle and 2 additional (still-unnamed) power-ups remain a Phase 3 stretch backlog — not committed MVP, distinct from Candy Heart. |
| ~~MVP content naming/theme~~ | ✅ | **Resolved 2026-07-15** — naming conversation held. Gummy Meteor, Jawbreaker, Sour Comet (obstacles), Candy Magnet, Candy Heart (power-ups), Hop Nebula Dust, Malt Meteorite, Candy Star (collectibles). Wired into `game-design.md` and `asset-spec.md`. |
| Scoring formula (survival + candy value, optional combo deferred) | ✅ | Approved 2026-07-15. |
| Anti-cheat plausibility formula (tied to spawn-table constants) | ✅ | Approved 2026-07-15. |
| Audio spec (track/cue list, volume persistence) | ✅ | Approved 2026-07-15. |
| Tunables appendix acknowledged as placeholder, not final | ✅ | Approved 2026-07-15. |
| ~~Control scheme~~ | ✅ | **Resolved 2026-07-15** — keyboard only, no mouse for gameplay. Arrow keys and WASD both bound to full 4-directional movement. New "Controls" section added to `game-design.md`. |
| Feel & experience: game feel/juice (hit-stop, screen shake, particle bursts, near-miss bonus) | ✅ | Approved 2026-07-15 — correctly left as honest TBD pending playtesting rather than guessed now. |
| Feel & experience: onboarding for non-gamer audience, first-time visitors | ✅ | Approved 2026-07-15. Relabeled — "party audience" was stale wording from the pre-correction kiosk framing; the item itself (non-gamer, first-attempt colleagues/visitors) still stands. |
| Feel & experience: cold-open first impression — no captive audience | ✅ | Approved 2026-07-15. Renamed — replaces the old "event/kiosk context" item now that there's no physical venue/queue (game is a standalone link, played anywhere/anytime). See `game-design.md`. |
| Feel & experience: difficulty floor for first-time players | ✅ | Approved 2026-07-15 — correctly left as honest TBD pending playtesting. |
| Feel & experience: visual readability at higher difficulty tiers | ✅ | Approved 2026-07-15 — correctly left as honest TBD pending playtesting. |
| Feel & experience: playtesting loop (who/how/when) | ✅ | Approved 2026-07-15 — 4-round plan tied to build-plan phases: Phase 2 informal gut-check, Phase 4 first formal round (3-5 fresh colleagues, individual/unaided), Phase 9 wider round (8-10+, varied familiarity, repeat-replay stress test), final pre-freeze smoke-test. Written into `game-design.md`. |
| Feel & experience: replay hook | ✅ | Approved 2026-07-15 — correctly left as honest TBD. |

## 3. `architecture.md` — technical spec

| Item | Status | Notes |
|---|---|---|
| Stack and folder structure | ✅ | Approved 2026-07-15. |
| React ⇄ Phaser integration (EventBus on GameOver only) | ✅ | Approved 2026-07-15 — StrictMode double-mount guard now documented with an actual code pattern (skip-first-cleanup `useRef` approach) rather than left implicit. |
| Engine patterns: in-scene events via Phaser event emitter, not direct calls | ✅ | Approved 2026-07-15. |
| Engine patterns: timed triggers via Phaser Time/Clock, not hand-rolled timestamps | ✅ | Approved 2026-07-15. |
| Engine patterns: collision via Arcade Physics group-overlap per spawn `kind` | ✅ | Approved 2026-07-15. |
| Engine patterns: fixed update-loop ordering in `PlayScene.update()` | ✅ | Approved 2026-07-15. |
| Runtime: frame-rate independence (delta-scaled, not frame-count-scaled) | ✅ | Approved 2026-07-15. |
| Runtime: scene lifecycle & restart cleanup (pools/timers/listeners reset) | ✅ | Approved 2026-07-15. |
| ~~Runtime: display/scaling mode~~ | ✅ | **Resolved 2026-07-15** — `Phaser.Scale.FIT`. |
| ~~Runtime: renderer mode (WebGL/Canvas/AUTO)~~ | ✅ | **Resolved 2026-07-15** — `Phaser.AUTO`. |
| ~~Runtime: initial load-time budget~~ | ✅ | **Resolved 2026-07-15** — ~5s on typical broadband, loading indicator for slower connections. |
| Runtime: RNG seeding (unseeded by default, seeded debug mode optional) | ✅ | Approved 2026-07-15. |
| Runtime: debug tooling (Arcade Physics debug draw in dev builds) | ✅ | Approved 2026-07-15. |
| Table Storage schema (`PartitionKey="score"`, `RowKey="{invertedScorePadded}_{submissionGuid}"`, insert-only) | ✅ | Approved 2026-07-15. |
| Input validation / rate-limiting (`PlayerName` sanitization, per-IP `RateLimits` table) | ✅ | Approved 2026-07-15. |
| Leaderboard refresh via polling (no SignalR) | ✅ | Approved 2026-07-15. |
| Score submission flow (no auth, direct POST) | ✅ | Approved 2026-07-15. |
| Score-submission resilience (fire-and-forget + localStorage retry queue, retry-safe via shared `submissionGuid`) | ✅ | Approved 2026-07-15. |
| Performance budget (60fps, pooling, atlas packing, graceful degradation) | ✅ | Approved 2026-07-15. |

## 4. `asset-spec.md` — asset spec

| Item | Status | Notes |
|---|---|---|
| Canvas size (720×960, fixed aspect, desktop-only) | ✅ | Approved 2026-07-15, corrected 2026-07-17 from 960×540 landscape to 720×960 portrait — see `architecture.md`'s Platform section. |
| MVP sprite list and roles | ✅ | Approved 2026-07-15. |
| Hitbox convention (data-driven `hitboxScale` per spawn-table entry) | ✅ | Approved 2026-07-15. |
| PixelLab export naming convention + manifest requirement | ✅ | Approved 2026-07-15. |
| Animation states per entity type | ✅ | Approved 2026-07-15. |
| ~~Pixel-art scale factor / per-sprite dimensions — currently TBD~~ | ✅ | **Resolved 2026-07-15** — ownership/timing decided (not the actual number): owned by `sprite-integrator`, set at Phase 7 kickoff. |
| ~~Audio asset sourcing — not yet decided~~ | ✅ | **Resolved 2026-07-15** — Kenney.nl CC0 packs. |

## 5. Agent briefs & skill

| Item | Status | Notes |
|---|---|---|
| `game-designer` scope and constraints | ✅ | Approved 2026-07-15. |
| `sprite-integrator` scope and constraints | ✅ | Approved 2026-07-15. |
| `azure-infra` scope and constraints | ✅ | Approved 2026-07-15. |
| `qa-tester` scope and constraints | ✅ | Approved 2026-07-15. |
| `code-reviewer` scope and constraints (read-only, Clean Code + correctness, defers to `qa-tester` for runtime behavior) | ✅ | Approved 2026-07-15 — fixed a stale "auth" reference in its qa-tester cross-reference while reviewing. |
| `sprite-import` skill checklist | ✅ | Approved 2026-07-15. |
| ~~Ownership of `hitboxScale` edits~~ | ✅ | **Resolved 2026-07-15** — `game-designer` always makes the edit (owns `game-design.md`); `sprite-integrator` supplies measured sprite bounds as a note. Applied the existing general handoff rule rather than needing a bespoke one — written into `CLAUDE.md` and both agent briefs. |

## 6. `dev-standards.md` — code/test/git/CI conventions

| Item | Status | Notes |
|---|---|---|
| Code quality & tooling (ESLint+Prettier from commit 1, TS strict, comment convention, no-god-files guardrail) | ✅ | Approved 2026-07-15. |
| Clean Code standards adopted (Robert C. Martin — SRP, DRY, naming, function size, error handling, boundaries, dead code), enforced via `code-reviewer` | ✅ | Approved 2026-07-15. Includes the carved-out exception for the deliberate data-driven systems, so `code-reviewer` doesn't flag that decision as premature abstraction. |
| Testing scope (unit tests for anti-cheat/scoring/insert-only submission logic only; rest via `qa-tester`) | ✅ | Approved 2026-07-15 — updated from stale "upsert" wording to match the insert-only model. |
| Definition of done per feature | ✅ | Approved 2026-07-15. |
| Git workflow (trunk-based, direct-to-`main`, commit message convention) | ✅ | Approved 2026-07-15. |
| ~~CI/deploy approach (SWA auto-deploy on push)~~ | ✅ | **Resolved 2026-07-15** — continuous auto-deploy, no manual gate, now that the beerfest date unblocked this decision. |
| Local dev setup | — | Placeholder until scaffolding exists, not blocking. |

## 7. Agent collaboration rules (in `CLAUDE.md`)

| Item | Status | Notes |
|---|---|---|
| Escalate-don't-improvise rule (general form of each brief's own version) | ✅ | Approved 2026-07-15 — fixed a stale "auth model" reference while reviewing. |
| Cross-domain handoff rule (owning agent edits; others hand over data as notes) | ✅ | Approved 2026-07-15 — demonstrated live this session via the `hitboxScale` resolution. |
| State-lives-in-repo rule (doc update + commit, never transcript-only) | ✅ | Approved 2026-07-15 — every decision this session went into the actual docs. |
| Autonomy ramps with trust (review-first, loosen per-agent once proven) | ✅ | Approved 2026-07-15. |
| How uncertainty surfaces mid-task (stop-and-return, relayed, resume same agent) | ✅ | Approved 2026-07-15 — demonstrated live via the `azure-infra` rate-limiting resume. |
| Task granularity rule (break phases into small steps for frequent checkpoints) | ✅ | Approved 2026-07-15 — demonstrated live via the naming/mechanics work being split into small steps. |
| Review agents as independent second check, not a duplicate of the implementer | ✅ | Approved 2026-07-15 — not yet exercised (no code exists), nothing to flag. |

## 8. `build-plan.md` — phased implementation order

| Item | Status | Notes |
|---|---|---|
| Phase order itself (vertical slice before systems, backend before score-submission wiring, assets before launch readiness, tuning last) | ✅ | Approved 2026-07-15. Updated — sign-in de-risk step removed now that Entra is dropped; "kiosk-readiness" renamed "launch readiness" (no physical venue). |
| Phase 1 — scaffold | ✅ | Approved 2026-07-15 — no longer includes an Entra sign-in de-risk spike. |
| Phase 2 — core vertical slice | ✅ | Approved 2026-07-15. |
| Phase 3 — data-driven systems + MVP content | ✅ | Approved 2026-07-15 — exit condition fixed to reflect names already being decided. |
| Phase 4 — feel & experience pass + first playtesting round | ✅ | Approved 2026-07-15 — matches the concrete playtesting plan in `game-design.md`. |
| Phase 5 — backend | ✅ | Approved 2026-07-15. |
| Phase 6 — score submission + resilience | ✅ | Approved 2026-07-15 — no sign-in step; name entry only. |
| Phase 7 — real assets | ✅ | Approved 2026-07-15 — fixed to reflect naming already being resolved, no longer a blocker. |
| Phase 8 — launch readiness | ✅ | Approved 2026-07-15 — renamed from "kiosk readiness," rewritten to verify already-decided runtime/CI settings hold up for repeated individual play, not tied to a venue. |
| Phase 9 — playtesting & tuning rounds, then freeze | ✅ | Approved 2026-07-15. |

---

## Open gaps (need a decision, not just a review)

These aren't covered by any existing doc. Resolve or explicitly defer each
before calling planning done.

| Gap | Status | Notes |
|---|---|---|
| ~~Beerfest date / deadline not recorded anywhere~~ | ✅ | **Resolved 2026-07-15**: beerfest is 2026-09-11. Carried into `docs/build-plan.md` Phase 9's freeze date. |
| ~~No control scheme defined~~ | ✅ | **Resolved 2026-07-15** — keyboard only, arrows + WASD, full 4-directional movement. See `game-design.md` row above. |
| ~~`hitboxScale` edit ownership ambiguous between two agents~~ | ✅ | **Resolved 2026-07-15** — see agent briefs row above |
| ~~Content naming session not yet held~~ | ✅ | **Resolved 2026-07-15** — held, names locked into `game-design.md` and `asset-spec.md`. |
| ~~Display/scaling mode not chosen~~ | ✅ | **Resolved 2026-07-15** — `Phaser.Scale.FIT`. See `architecture.md` row above. |
| ~~Renderer mode (WebGL/Canvas/AUTO) not chosen~~ | ✅ | **Resolved 2026-07-15** — `Phaser.AUTO`. See `architecture.md` row above. |
| ~~Initial load-time budget not defined~~ | ✅ | **Resolved 2026-07-15** — ~5s on typical broadband, loading indicator for slower connections. See `architecture.md` row above. |

---

## Overall sign-off

- [x] Sections 1-5 (original planning docs) fully Approved
- [x] Sections 6-7 (dev standards, agent collaboration rules) fully Approved
- [x] Section 8 (build-plan phase order) fully Approved
- [x] All open gaps resolved or explicitly deferred with a stated reason

**Planning phase status: SIGNED OFF (2026-07-15).**
