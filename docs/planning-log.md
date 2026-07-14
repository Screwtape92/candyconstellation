# Planning Log — Candy Constellation: Space Dodger

Decision history from the initial project planning session (2026-07-14). This captures the *why* behind each major decision so it isn't only preserved in chat history. `docs/game-design.md`, `docs/architecture.md`, and `docs/asset-spec.md` hold the current-state specs derived from these decisions — this log is the reasoning trail, not the source of truth for current behavior.

## Genre: endless vertical space dodger, not one-hit death
Astronaut auto-flies through a candy-asteroid field, dodging obstacles and collecting candy ingredients, with a health bar and power-ups rather than instant death on collision.
**Why:** retrofitting a health/effect system onto code written assuming instant death is expensive; building it generically from day one is cheap and still allows a small MVP.

## Stack: Vite + React + TypeScript + Phaser 3 + Tailwind
**Why:** Phaser provides sprite animation, arcade physics/collision, and scene management out of the box, meaning far less custom engine code than raw Canvas for this genre. React handles the surrounding site shell (landing page, leaderboard UI); Tailwind themes it quickly.

## Backend: Azure (Static Web Apps + Functions + Table Storage), not Supabase
**Why:** the user wants everything hosted on Azure specifically, on a low/no budget. Static Web Apps' free tier covers hosting + an integrated Functions API; Table Storage is near-free pay-per-transaction pricing with no throughput tuning and no free-tier-account contention risk (unlike Cosmos DB, where a subscription only gets one free account). Leaderboard refresh uses simple polling (5-10s) instead of push-based realtime, avoiding the need for Azure SignalR — realistically lands at $0/month.

## Platform: desktop web only
**Why:** the user confirmed mobile/touch support isn't needed, which removed touch controls, portrait/mobile sizing, and phone QR-code flows from scope — landscape 960×540 canvas, keyboard/mouse-only input.

## Sign-in: Microsoft Entra ID, multi-tenant app under the user's own subscription
**Why:** everyone at the company has Entra ID (Azure AD) company email accounts, so real identity replaces free-text names — this prevents duplicate/joke leaderboard entries and enables a "best score per person" model (keyed by Entra object ID). The app is registered as multi-tenant under the user's *own* subscription (not the company's), requesting only low-privilege scopes (`openid`/`profile`/`email`/`User.Read`), so individual employees can consent without any company IT/admin action.
**Known risk:** some tenants lock down user consent so only an admin can approve outside apps, even for low-privilege scopes — this is outside the user's control and can't be verified without a real employee attempting the sign-in flow. Because of this, testing the sign-in flow end-to-end is the very first task of implementation, with free-text name entry as the immediate fallback if it's blocked.

## Generic, data-driven health/power-up/spawn systems from the start
**Why:** the user wanted to start with simple content but wasn't sure whether to design the bigger system upfront. Decision: build the health system, timed power-up effects, and obstacle/collectible spawning as generic, data-driven systems immediately (a spawn table + a timed-effect system), but only populate them with 1-2 obstacle types and 1 power-up in the MVP. This makes adding more content later a data change, not a code change — "start simple" without having to redo the architecture.

## Full design-planning checklist, not just bounding boxes
The user asked specifically about sprite bounding boxes; that turned out to be one instance of a broader pattern — anything an agent would otherwise silently improvise, or that's expensive to redo once code exists, gets decided once in a doc. Full list locked down upfront: game state machine, difficulty ceiling (spawn rate/speed plateaus rather than climbing forever), score-submission network resilience (never blocks gameplay), a concrete anti-cheat plausibility formula, a performance budget (60fps, entity/particle caps), and an audio spec. Feel/tuning constants (ship acceleration, drag, spawn jitter) were deliberately left unspecified, marked "tunable via playtesting" rather than fixed, since pinning exact numbers before anything is playable would just mean revising them later.

## Agentic development structure (CLAUDE.md, custom subagents, a skill)
**Why:** this is the user's first fully agentic multi-agent build, and they wanted the whole structure planned before any code — ground-truth docs, a short `CLAUDE.md` pointing at them, narrow-scope subagents (`game-designer`, `sprite-integrator`, `azure-infra`, `qa-tester`), and a `sprite-import` skill for the repeated PixelLab-export-validation task. Multi-agent workflow orchestration was explicitly deferred as unnecessary ceremony at this project's scale.

## Repo cleanup: `candyconstellation` as the actual project root
The user had already independently created a `candyconstellation` folder, connected to `github.com/Screwtape92/candyconstellation`, with its own git history — while a separate `git init` had been run one level up, in the parent `Beerfest` folder, creating a nested-repo situation.
**Why fixed:** a git repo nested inside another repo is messy (the outer repo would try to track the inner one as an embedded submodule). Resolution: made `candyconstellation` the real project root, moved the `.gitignore`/README content into it, and deleted the redundant outer repo (which had zero commits, so nothing was lost).

## Ultraplan attempts and why this log exists
The user tried handing planning off to Ultraplan (Claude Code on the web) twice. Both times the cloud session had no material to work from, because Ultraplan's cloud agents only see what's actually committed to the GitHub repo — they have no access to local chat history or the local plan-mode file used to reach approval in the CLI session. This log exists specifically to give any future cloud or local agent that same context, in-repo, rather than only in a conversation transcript.
