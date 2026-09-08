# Architecture — Candy Constellation: Space Dodger

See `docs/planning-log.md` for why this stack/backend was chosen. This doc is
the current-state spec — update it whenever an architectural decision changes.

## Stack

- **Frontend**: Vite + React + TypeScript + Phaser 4 + Tailwind. (Corrected
  2026-07-17 — planning targeted Phaser 3, but Phase 1 scaffolding installed
  latest, which resolved to ^4.2.1; Phase 2.1's movement code confirmed the
  APIs used — `Scene`, Arcade Physics, `Scale.FIT`, `Phaser.AUTO` — all work
  fine on 4, so the version was updated here rather than pinning back to 3.)
- **Backend**: Azure Static Web Apps (hosting + integrated Functions API) +
  Azure Table Storage (leaderboard persistence). **Added 2026-09-08**: a
  second, self-hosted deployment path (`server/`) exists alongside this —
  see "Self-hosted deployment (home box + tunnel)" below for why and how it
  differs. Azure remains the primary/original design; the self-hosted path
  is an alternate that reuses the same validation/anti-cheat logic against a
  SQLite file instead of Table Storage.
- **Auth**: none. Players submit a free-text name at GameOver, classic
  arcade-high-score-table style — no sign-in step, no identity provider. See
  `docs/planning-log.md` ("Sign-in: dropped Entra ID...") for why.
- **Platform**: desktop web only — 720×960 portrait canvas, keyboard/mouse
  input. No mobile/touch support. **Corrected 2026-07-17**: originally
  planned as a 960×540 landscape canvas, but that dimension was inherited by
  default from "desktop, not mobile" reasoning rather than a deliberate fit
  for the genre — playtesting the Phase 2.2 vertical slice surfaced that
  landscape wasted horizontal space and starved obstacles of vertical travel
  distance (i.e. player reaction time), which is the opposite of what a
  vertical dodger needs. Switched to portrait (taller than wide) to match
  genre precedent (vertical shmups/dodgers), while staying desktop/keyboard-
  only — no mobile scope reintroduced.

## Folder structure

```
src/
  main.tsx, App.tsx
  pages/           Landing, PostGame (name entry), Leaderboard
  game/
    scenes/        BootScene.ts, PreloadScene.ts, PlayScene.ts, GameOverScene.ts
    systems/        HealthSystem, PowerUpSystem, SpawnSystem, DifficultySystem, ScoreSystem
    data/           spawnTable.ts, powerUps.ts, obstacles.ts
    entities/       Player.ts, Obstacle.ts, Collectible.ts
    PhaserGame.tsx  React wrapper mounting/unmounting Phaser.Game
  api-client/       submitScore, getLeaderboard, local retry queue
api/                Azure Functions
  submitScore/
  getLeaderboard/
  shared/           tableStorageClient, inputValidation, antiCheat, rateLimit
server/             Self-hosted alternative (home box + tunnel) - see
                    "Self-hosted deployment" below. index.ts, api.ts, db.ts,
                    rateLimit.ts, scores.ts, staticFiles.ts. Imports
                    api/shared/{inputValidation,antiCheat,scoreKey}.ts
                    directly (storage-agnostic, so reused as-is).
```

## React ⇄ Phaser integration

React owns the shell: routing, pre-game (landing) and post-game (name entry/
score submission/leaderboard) screens. A `<PhaserGame>` component creates the
`Phaser.Game` instance in a `useEffect` on mount and destroys it on unmount.

- **React 18 StrictMode guard**: in dev, StrictMode double-invokes effects
  (mount → cleanup → mount) to surface effects that aren't idempotent.
  Without a guard, that double-invoke would create two `Phaser.Game`
  instances in quick succession — duplicate input handling, duplicate audio,
  two render loops fighting over the same canvas — even if the first is
  nominally cleaned up, the churn is real (Phaser game init touches the
  canvas, WebGL context, and audio context, none of which are free or fully
  synchronous to tear down). `<PhaserGame>` guards against this with a
  `useRef` pair: one flag holding the instance, one flag that skips the
  *first* cleanup pass (StrictMode's phantom unmount) so the instance is only
  actually created once, while still tearing down correctly on the real
  unmount:
  ```ts
  const gameRef = useRef<Phaser.Game | null>(null);
  const isFirstCleanup = useRef(true);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(config);
    }

    return () => {
      if (isFirstCleanup.current) {
        // StrictMode's simulated unmount — skip destroy, keep the instance alive
        isFirstCleanup.current = false;
        return;
      }
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);
  ```
  The cleanup closure must be returned unconditionally from every effect run —
  only the *creation* line is guarded by `if (!gameRef.current)`. An earlier
  version of this guard returned early (`if (gameRef.current) return;`) before
  reaching the `return () => {...}` line on the effect's second (real) run,
  which meant no cleanup was registered for that commit at all — so on a
  genuine unmount, React had nothing to call and `destroy()` never fired. With
  the cleanup always registered, this relies on StrictMode's double-invoke
  happening only once, synchronously, around the initial mount — not on every
  re-render — so the "skip the first cleanup" trick correctly distinguishes
  the phantom unmount from a real one. On a genuine unmount (navigating away
  from the game route), the instance is destroyed exactly once.

**Superseded 2026-09-08.** The in-canvas HUD (health/score text, the
power-up timer bars, the on-ship badges) is still entirely inside Phaser —
that part of the original decision holds. What changed: the portrait canvas
(GAME_WIDTH×GAME_HEIGHT = 720×960) doesn't fill a wide desktop viewport, and
playtest feedback wanted a large, unmissable status readout in that open
space either side of it — `PlaySidePanels.tsx`, mirrored on both sides.
That's DOM/React, not Phaser, so it needs a live read of health/score/active
power-ups every frame, not just the one-time GameOver payload. The crossing
(`src/game/eventBus.ts`) now carries two kinds of event on one
`Phaser.Events.EventEmitter`, still one-directional (Phaser emits, React only
listens):

- `GAME_OVER_EVENT` — one-time-per-run, unchanged: `{ score, elapsedSec }`,
  driving score submission and the leaderboard UI.
- `HUD_UPDATE_EVENT` — every frame, from `PlayScene.update()`: `{ health,
  maxHealth, score, powerUps }`. A small POJO each frame is not the kind of
  per-frame allocation this doc's performance budget is about (see below) —
  that budget targets particle/object churn during busy gameplay, not one
  small object read by a React subscriber.
- `BLASTER_READY_EVENT` — once per Sour Blaster pickup (not just the first),
  driving the side panels' flashing "SPACE TO SHOOT!" prompt. Distinct from
  the in-canvas one-time fire-key hint (`BlasterSystem.ts`), which stays
  once-per-session on purpose — the two serve different audiences (a
  returning player doesn't need the in-canvas explainer again, but the
  large flash is worth repeating every time the weapon comes back).

## Engine patterns: events, triggers, and collision

Conventions for how systems talk to each other and to entities *inside* a
run — pinned down once so systems (or successive agent sessions) don't each
invent their own version.

- **In-scene events**: Phaser's built-in event emitter (`scene.events.emit`/
  `.on`) is the convention for system-to-system signaling within `PlayScene`
  — e.g. `HealthSystem` emits `playerHit` on a collision, `ScoreSystem`
  listens for `candyCollected`. Don't reach for a new pub/sub library, and
  don't have systems call each other's methods directly — that couples them
  and defeats the point of separate systems. This is distinct from the
  EventBus above, which exists solely to cross the Phaser→React boundary
  (GameOver, and since 2026-09-08 the live HUD/blaster-ready crossing too) —
  it never carries system-to-system signaling that stays inside a scene.
- **Timed/duration triggers**: power-up expiry, the invulnerability window,
  and spawn-interval scheduling all use Phaser's Time/Clock API
  (`scene.time.delayedCall`, `scene.time.addEvent`) — not a hand-rolled
  "store an expiry timestamp and compare it every `update()`" pattern.
- **Collision/trigger detection**: all obstacle/collectible/power-up
  interactions go through Arcade Physics group-overlap callbacks, keyed by
  the spawn table's `kind` (`obstacle`/`collectible`/`powerup`) — never a
  manual distance or AABB check in a loop. One physics group per `kind`, one
  overlap callback per group pair (player↔obstacles, player↔collectibles,
  player↔powerups).
- **Update-loop ordering**: `PlayScene.update(time, delta)` explicitly
  orchestrates systems in a fixed order each frame — spawn → difficulty →
  collision/health → score — rather than each system self-registering as an
  independent update listener with unspecified ordering. Order matters for
  correctness here (e.g. invulnerability must be checked before damage is
  applied), not just style.

## Runtime concerns

- **Frame-rate independence**: all movement, spawn timing, and
  difficulty-ramp math scale by Phaser's `delta` (ms since last frame), never
  by frame count — the game must play the same on a fast gaming PC and a
  slower/older laptop, not run faster/slower depending on whatever hardware
  a given player happens to be on (this is a public web link with no
  controlled hardware — every player brings their own device).
- **Scene lifecycle & restart cleanup**: given the "instant restart"
  requirement in `docs/game-design.md`'s Feel & experience section,
  restarting a run must fully reset pooled objects, clear any pending timers
  from the previous run, and remove stale event listeners — not just create a
  new `PlayScene` instance and hope old state doesn't leak. This matters for
  any player who replays several runs in a row in the same browser tab
  without reloading the page: leaked timers/listeners compound across
  consecutive runs into a real problem, even if a single run looks fine in
  isolation.
- **Display/scaling mode**: the canvas is fixed at 720×960, but browser
  window sizes are unknown and uncontrolled — this is a public web link, so
  every player opens it in their own browser window at whatever size they
  happen to have. Uses Phaser's Scale Manager `FIT` mode
  (`Phaser.Scale.FIT`): scales the fixed 720×960 canvas to fit the browser
  window while preserving aspect ratio (letterboxing rather than
  stretching/cropping). Chosen because the canvas size is fixed and there's
  no need for responsive UI reflow — a mode like `RESIZE` would only add
  complexity with no benefit here.
- **Renderer mode**: uses `Phaser.AUTO` — Phaser's recommended default, which
  picks WebGL when available and falls back to Canvas automatically. Chosen
  because this is a simple 2D game with no exotic shader needs, so forcing
  one renderer over the other (`Phaser.WEBGL` or `Phaser.CANVAS`) has no
  benefit and only reduces device compatibility for players opening this on
  their own, unknown hardware/browser.
- **Initial load-time budget**: target playable-within-~5-seconds on a
  typical broadband connection, given the small MVP asset footprint (a
  handful of sprites, one music track, five SFX cues). Include a loading
  indicator/progress bar in `PreloadScene` for slower connections, rather
  than a hard cutoff that fails ungracefully — a player on a slow home/mobile
  connection should see visible progress, not a blank screen or a timeout
  error.
- **RNG**: spawn jitter and weighted spawn-table selection use unseeded
  `Math.random` by default. A seeded mode for reproducible debug runs is a
  nice-to-have, not required — TBD if worth adding.
- **Debug tooling**: enable Phaser's built-in Arcade Physics debug draw
  (visualizes hitboxes/overlaps) in dev builds only. A visual debug overlay
  will settle far more hitbox-shaped questions at a glance during
  development than more spec text would.

## Table Storage schema

Table: `Scores`

There's no auth and no stable per-player identity to key against, so this is
an **insert-only** leaderboard: every submitted run is its own row, and the
same name can legitimately appear multiple times (no dedup, no "best score
per name" — see `docs/planning-log.md`). The schema below replaces the old
upsert-if-greater/identity-keyed design.

- `PartitionKey = "score"` — single partition. This is a standalone public web
  link with no venue and no bounded timeframe (not a single event), so this
  partition grows for as long as the game stays live rather than capping out
  at a fixed attendee/row count — that's a real difference from the original
  "event scale" framing and worth calling out explicitly. It's still a
  reasonable choice: Table Storage partitions comfortably scale to millions
  of entities before performance degrades, and because `RowKey` already
  encodes sort order (see below), `getLeaderboard`'s `$top=N` query only ever
  reads from the head of the partition's key range — it never needs to scan
  or sort the whole partition, so query cost doesn't grow with partition
  size. What does grow unboundedly is storage cost, but Table Storage bills
  storage at a few cents/GB/month, so sustained growth stays cheap even over
  a long, open-ended lifetime. There's no retention/archival policy today —
  nothing ever prunes old rows — and the per-IP rate limit below also
  incidentally bounds how fast the partition can grow from abusive
  submission traffic. If storage volume or row count ever becomes a genuine
  concern, revisit with an archival/pruning job; not needed at today's scale.
- `RowKey = "{invertedScorePadded}_{submissionGuid}"` — encodes leaderboard
  order directly in the key, since there's no identity to upsert against
  anymore:
  - `invertedScorePadded` = `(fixedOffset - score)`, zero-padded to a fixed
    digit width. **Chosen (Phase 5.2):** `fixedOffset = 9_999_999_999` and a
    10-digit pad width (see `api/shared/scoreKey.ts`, `SCORE_OFFSET` /
    `SCORE_DIGITS`). This is generous headroom: survival earns only 2 pts/sec
    and the anti-cheat bound keeps even a 24h run's max *accepted* score in the
    ~10^8 range, so a 10-digit offset sits comfortably above anything that can
    pass validation. `submitScore` rejects any `score >= fixedOffset` so the
    subtraction can never go negative (which would break fixed-width padding and
    thus the sort order). Table Storage returns entities within a partition in
    ascending `RowKey` order, so inverting the score means ascending key
    order = descending score order.
  - `submissionGuid` is a client-generated GUID, unique per run, appended
    purely to avoid `RowKey` collisions between two rows with the same
    score — it carries no other meaning (no tie-break rule beyond
    "collisions don't clobber each other").
  - `getLeaderboard` queries the partition with `$top=N` and reads results in
    natural (ascending) `RowKey` order — top-N highest scores, no in-memory
    sort needed.
- Fields: `PlayerName`, `Score`, `ElapsedSec`, `AchievedAtUtc`.
- Submission is a plain insert (`InsertEntity`), never an upsert — there's no
  record to overwrite. **Retry safety**: the client generates
  `submissionGuid` once per run and reuses the same value across retries (see
  Score-submission resilience below), so a retried insert of an
  already-succeeded submission collides on the same `RowKey` and is rejected
  by Table Storage (409 Conflict) instead of creating a duplicate row; the
  client treats that 409 as success.

**Input validation.** `PlayerName` is untrusted free-text input that gets
displayed back to everyone on the Leaderboard page — with no auth, every
submission is anonymous, untrusted input by default. `submitScore` validates
and sanitizes it server-side (reject empty/missing, cap length, strip control
characters) and the Leaderboard page encodes it safely on render, so a
submitted name can't inject markup/script. This is a new concern introduced
by dropping auth; it didn't exist when identity was validated server-side.

## Leaderboard refresh

The Leaderboard page polls `getLeaderboard` on a simple interval (5-10s)
rather than push-based realtime — this avoids needing Azure SignalR and
realistically keeps the whole backend at $0/month on the Static Web Apps
free tier plus Table Storage's pay-per-transaction pricing.

## Score submission flow

No sign-in step. At GameOver, the player types a free-text name in the
post-game screen; `submitScore` is called directly with
`{ name, score, elapsedSec, submissionGuid }` — no bearer token, no identity
to validate, no consent/fallback logic (there's no primary auth path to fall
back from).

- `submitScore` validates and sanitizes `name` server-side (see Input
  validation above) and checks `score`/`elapsedSec` against the anti-cheat
  plausibility formula in `docs/game-design.md` — that check is
  identity-independent and unaffected by dropping auth.
- Because every request is anonymous, there's no server-enforceable "who
  submitted this" check and no impersonation prevention — an accepted
  trade-off, see `docs/planning-log.md`.
- **Rate-limiting (judgment call, flagging for review, not yet signed off):**
  this is a standalone public web link, not a bounded venue/timeframe event —
  there's no fixed attendee count and no closing time, so an unrated
  `submitScore` is reachable by a scripted client indefinitely. The anti-cheat
  plausibility check (above) only rejects implausible score *values*; it does
  nothing to stop high-volume spam of plausible-looking fake runs. Given that,
  a lightweight per-IP rate limit is warranted:
  - A `RateLimits` table: `PartitionKey = clientIp` (from the
    `x-forwarded-for` header Azure Static Web Apps/Functions populates),
    `RowKey = timeBucket` (e.g. current 10-minute window). `submitScore`
    increments the bucket's counter (upsert-merge) before writing to `Scores`,
    and rejects with `429` once a threshold is exceeded (e.g. more than 5
    submissions per IP per 10 minutes — generous for a real player retrying a
    few runs, restrictive for a script).
  - Chosen because it's proportionate to a no-budget hobby project: it reuses
    the Table Storage the project already pays for (one extra read/write per
    submission, still pay-per-transaction pricing), needs no additional Azure
    service (no API Management, no Front Door WAF), and no CAPTCHA/UX cost for
    legitimate players.
  - **Accepted limitation**: this only slows down single-source scripted
    abuse — a rotating-IP or distributed attacker isn't stopped by it. Judged
    acceptable given the project's scale/budget; if spam becomes a real
    problem in practice, revisit with something heavier (e.g. Azure Front
    Door rate-limiting rules, or a lightweight per-session proof token issued
    at game start and required at submit time).

## Score-submission resilience

Submission must never block gameplay:

- At GameOver, `submitScore` is fired as a background POST; the UI proceeds
  optimistically to the post-game screen without waiting on the response.
- Pending submissions are queued in `localStorage` keyed by the same
  client-generated `submissionGuid` used in the `Scores` table `RowKey` (see
  Table Storage schema above), and retried with backoff on next load or on an
  interval — so a dropped connection (a player's home wifi or mobile network
  hiccuping, not a controlled venue network) doesn't lose a score, and a
  retried submission can't create a duplicate row.
- Starting a new run or navigating the menu never waits on a pending
  submission.

## Self-hosted deployment (home box + tunnel)

**Added 2026-09-08.** The Azure subscription originally intended for this
project (`Ian Joubert 3 - MPN`) turned out to be in a `Disabled` (read-only)
billing state 3 days before the event, with no time to resolve it — Azure
returns `ReadOnlyDisabledSubscription` on any write/deploy call. Rather than
block on that, a second deployment path was added: run everything on a home
box (or any machine with Node 22+) and expose it via a tunnel. This is an
*alternate* path, not a replacement — the Azure Functions code under `api/`
is untouched and still the original design if the subscription gets
reactivated later.

**Tunnel choice: Cloudflare Tunnel over ngrok (decided 2026-09-08).** ngrok's
free tier doesn't support custom domains at all (paid tiers only) and shows
visitors an interstitial warning page before forwarding. Cloudflare Tunnel is
free with no such interstitial, and supports a real custom domain out of the
box (`cloudflared tunnel route dns` manages the CNAME on a Cloudflare-hosted
zone directly) — a better fit for a link that gets shared with the whole
company. The server itself is tunnel-agnostic: it's a single process on a
single port doing same-origin serving, so nothing here depends on which
tunnel product sits in front of it. The one place the tunnel choice actually
touches the code is client-IP detection for rate-limiting, covered below.

**Why this was easy to add rather than a rewrite:** the frontend already
calls same-origin `fetch('/api/submitScore')` / `fetch('/api/getLeaderboard')`
with no environment-specific base URL (see "Score-submission resilience"
below and `src/api-client/*`), so serving the frontend build and the API from
one process on one port needed zero frontend changes. The app also has no
client-side router (`App.tsx`: "one screen transitioning to another, not
deep-linkable routes"), so the static file server needs no SPA history
fallback beyond `/` itself.

**What's different from the Azure path:**

- **Storage**: SQLite (Node's built-in, experimental `node:sqlite`) replaces
  Azure Table Storage. One file at `data/candy-constellation.db`, created on
  first run, gitignored. Requires Node 22.5+ (when `node:sqlite` first
  landed, experimental) — the general "Node 22+" floor in "Local dev setup"
  below isn't quite enough on its own for this path specifically. Chosen
  over `better-sqlite3` specifically because it needs no native build step — the whole point of this path is "nothing to
  provision, just run it," and a native-module compile failure on an
  unfamiliar home box would defeat that.
  - `scores` table: `submission_guid TEXT UNIQUE` (retry-safety, see below),
    `player_name`, `score`, `elapsed_sec`, `achieved_at_utc`. No inverted-key
    encoding like Table Storage's `RowKey` — SQLite just does
    `ORDER BY score DESC LIMIT ?` directly, so `api/shared/scoreKey.ts`'s
    `buildRowKey`/`invertedScorePadded` aren't used here (only its
    `SCORE_OFFSET` validation bound is, via `inputValidation.ts`).
  - `rate_limits` table: `(client_ip, bucket)` primary key + `count`, same
    10-minute-bucket/5-per-window policy as `api/shared/rateLimit.ts`, just
    against SQLite instead of a Table Storage `RateLimits` table.
- **Server**: a single Node process (`server/index.ts`, plain `node:http` —
  no Express or other HTTP framework dependency, since the route surface is
  two JSON endpoints plus static files) serves the Vite production build
  (`dist/`) and the two API routes from one port (default `8787`, override
  with `PORT`). No CORS needed — same origin, same process.
- **Shared logic, not duplicated**: `validateSubmission` (`inputValidation.ts`)
  and `isPlausibleScore` (`antiCheat.ts`) are imported directly from
  `api/shared/` — those two modules have zero Azure-specific imports, so
  `server/tsconfig.json` compiles them into its own build alongside
  `server/*.ts` rather than duplicating the logic. Only the storage layer
  (`tableStorageClient.ts`/`rateLimit.ts` on the Azure side,
  `db.ts`/`rateLimit.ts` on this side) differs.
- **Retry-safety**: mirrors the Azure path's rule exactly — a retried
  `submitScore` reuses the same client-generated `submissionGuid`, which
  collides on the `scores.submission_guid UNIQUE` constraint; that's caught
  and treated as success (`{ ok: true, duplicate: true }`, HTTP 200) instead
  of erroring, so the client's localStorage retry queue clears.
- **Rate-limiting/client IP**: identical policy to `api/shared/rateLimit.ts`
  (5 submissions per IP per 10-minute window). `getClientIp`
  (`server/rateLimit.ts`) checks headers in priority order: `cf-connecting-ip`
  first (what Cloudflare — including through a Cloudflare Tunnel — sets to
  the real visitor IP; preferred over `x-forwarded-for` specifically because
  cloudflared has a known bug, [cloudflare/cloudflared#1426](https://github.com/cloudflare/cloudflared/issues/1426),
  where `x-forwarded-for` reaching the origin can be wrong or missing), then
  `x-forwarded-for` (set by ngrok's free tier, and by Azure Front Door/SWA in
  the original deployment), then the raw socket address for a direct
  connection. **Verified 2026-09-08**: a request carrying both headers rate-
  limits per `cf-connecting-ip`, correctly ignoring a misleading
  `x-forwarded-for` sent alongside it.

**Build/run.** From the repo root:

```
npm run build          # frontend -> dist/
npm run build:server    # server/*.ts + the three shared api/shared modules -> server/dist/
npm run start:server    # node server/dist/server/index.js — serves dist/ + the API on :8787
```

Then, separately, run a tunnel pointed at `:8787` to get a public URL — e.g.
`cloudflared tunnel run <name>` (after `cloudflared tunnel login` +
`cloudflared tunnel route dns` against a Cloudflare-hosted zone) or
`ngrok http 8787`. Neither is configured by this repo — that's the
operator's own Cloudflare/ngrok account, done on whichever box actually
runs the tunnel.

`server/tsconfig.json` compiles with `module`/`moduleResolution: "nodenext"`,
which determines each *source* file's CJS-vs-ESM output by its nearest
`package.json` — `api/shared/*.ts` (under `api/`, no `"type"` field, so
CommonJS) compiles to CommonJS syntax even though it's emitted into
`server/dist/api/shared/`, which has no `package.json` of its own and would
otherwise inherit the repo root's `"type": "module"` at runtime — a mismatch
that made Node parse valid CommonJS output as ESM and see zero exports.
`scripts/mark-server-dist-cjs.mjs` (run automatically as part of
`build:server`) drops a `{"type":"commonjs"}` package.json into
`server/dist/api/` to fix that boundary — the standard Node fix for a
dual-package hazard like this, not a workaround specific to this project.

**Verified 2026-09-08** end-to-end against a local build: static serving
(`/` and `/assets/*`, 404 for genuinely missing files), `submitScore` (valid
201, retried-`submissionGuid` duplicate 200, implausible-score 422,
malformed-JSON 400), rate-limiting (429 after 5 in a window), and
`getLeaderboard` (empty, then reflecting an inserted row, `ORDER BY score
DESC`).

## Performance budget

- Target: 60fps on typical laptop hardware.
- Object pooling for obstacles, collectibles, and particles — no per-frame
  allocation of game objects.
- Explicit caps on simultaneous on-screen obstacles/collectibles and active
  particles.
- Sprites packed into texture atlases to bound draw calls.
- Graceful degradation: when a pool is exhausted, skip spawning rather than
  growing the pool or dropping frames.
