# Architecture — Candy Constellation: Space Dodger

See `docs/planning-log.md` for why this stack/backend was chosen. This doc is
the current-state spec — update it whenever an architectural decision changes.

## Stack

- **Frontend**: Vite + React + TypeScript + Phaser 3 + Tailwind.
- **Backend**: Azure Static Web Apps (hosting + integrated Functions API) +
  Azure Table Storage (leaderboard persistence).
- **Auth**: Microsoft Entra ID, multi-tenant app registration under the
  user's own subscription.
- **Platform**: desktop web only — 960×540 landscape canvas, keyboard/mouse
  input. No mobile/touch support.

## Folder structure

```
src/
  main.tsx, App.tsx
  auth/            MSAL config, AuthProvider
  pages/           Landing, Leaderboard
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
  shared/           tableStorageClient, jwtValidation, antiCheat
```

## React ⇄ Phaser integration

React owns the shell: routing, auth, pre-game (landing/sign-in) and post-game
(score submission/leaderboard) screens. A `<PhaserGame>` component creates the
`Phaser.Game` instance in a `useEffect` on mount and destroys it on unmount.

In-game HUD (health, score, active power-up) stays inside Phaser — it's
tightly coupled to the render loop. Only the GameOver transition crosses back
to React, via a small EventBus: `{ score, elapsedSec }`. React then drives
score submission and the leaderboard UI.

## Table Storage schema

Table: `Scores`

- `PartitionKey = "player"` — single partition. At company scale, row counts
  are small enough that in-memory sort for top-N (done in the
  `getLeaderboard` Function after fetching the partition) is simpler than
  tuning a partitioning scheme, and Table Storage has no server-side sort
  regardless.
- `RowKey = "{tid}_{oid}"` — tenant ID + object ID, not `oid` alone, since
  `oid` is only unique *within* a tenant and this is a multi-tenant app.
- Fields: `DisplayName`, `BestScore`, `BestScoreElapsedSec`, `AchievedAtUtc`.
- Submission is an upsert-if-greater: only overwrite `BestScore` if the new
  score is higher. This gives "best score per person" and idempotent retries
  for free — a retried submission of the same run never regresses the record.

**No guest entries.** Free-text-name (consent-blocked fallback) runs are
never written to this table — guest play is fully playable but not
competitive on the leaderboard. `submitScore` requires a validated bearer
token; unauthenticated calls are rejected server-side (not just hidden in the
UI), so this is enforced independent of the client.

## Leaderboard refresh

The Leaderboard page polls `getLeaderboard` on a simple interval (5-10s)
rather than push-based realtime — this avoids needing Azure SignalR and
realistically keeps the whole backend at $0/month on the Static Web Apps
free tier plus Table Storage's pay-per-transaction pricing.

## Entra ID auth flow

- `@azure/msal-react` + `@azure/msal-browser`, multi-tenant app registration,
  scopes: `openid`, `profile`, `email`, `User.Read`. Redirect URI = the
  Static Web App's URL.
- The client-side ID token is used for display only (name/avatar). The
  `submitScore` Function independently validates the bearer access token
  against Microsoft's JWKS (`iss`/`aud` checks) before trusting `oid`/`tid` —
  client-supplied identity claims are never trusted directly.
- **Fallback**: if sign-in fails with a consent-blocked error (e.g.
  `AADSTS65001` — some tenants restrict user consent to admin-approved apps
  only), the UI drops to a free-text name entry field so the game is still
  playable at the beerfest. This path never calls `submitScore` (see "no
  guest entries" above). **Testing this flow end-to-end with a real company
  Entra account is the first task of implementation**, since it can't be
  verified without one.

## Score-submission resilience

Submission must never block gameplay:

- At GameOver, `submitScore` is fired as a background POST; the UI proceeds
  optimistically to the post-game screen without waiting on the response.
- Pending submissions are queued in `localStorage` keyed by a client-
  generated GUID, and retried with backoff on next load or on an interval —
  so a dropped connection at the beerfest doesn't lose a score.
- Starting a new run or navigating the menu never waits on a pending
  submission.

## Performance budget

- Target: 60fps on typical laptop hardware.
- Object pooling for obstacles, collectibles, and particles — no per-frame
  allocation of game objects.
- Explicit caps on simultaneous on-screen obstacles/collectibles and active
  particles.
- Sprites packed into texture atlases to bound draw calls.
- Graceful degradation: when a pool is exhausted, skip spawning rather than
  growing the pool or dropping frames.
