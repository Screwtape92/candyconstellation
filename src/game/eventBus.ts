import Phaser from 'phaser'

// The Phaser->React crossing (docs/architecture.md "React ⇄ Phaser
// integration"). One-directional: Phaser emits, React only listens. Reuses
// Phaser's own EventEmitter (already a dependency) rather than adding a
// pub/sub library, matching the project's "don't reach for a new library"
// convention for events. Deliberately NOT the in-scene emitter (scene.events)
// used for system-to-system signaling within PlayScene (docs/architecture.md
// "Engine patterns") — that one never leaves the scene.
//
// Two kinds of crossing share this one emitter, by distinct event name:
//
// 1. GAME_OVER_EVENT — one-time-per-run. GameOverScene emits once when a run
//    ends; the React shell listens to drive the post-game (name entry/score
//    submission/leaderboard) flow.
export interface GameOverPayload {
  score: number
  elapsedSec: number
  // Run-token verification (docs/game-design.md "Run token verification"):
  // fetched at PlayScene start, carried through GameOver to submitScore. Null
  // when the fetch hasn't resolved (an extremely rare timing edge case — see
  // src/api-client/startRun.ts) — submitScore will reject a submission with
  // no token rather than silently skip verification for it.
  runToken: string | null
  // Score decomposition check (docs/game-design.md "Score decomposition
  // check"): ScoreSystem's own running tallies, reported alongside the total
  // so submitScore can verify score is exactly reconstructible from a real
  // survival/candy/kill breakdown, not just plausible in aggregate.
  candyPoints: number
  killPoints: number
}

export const GAME_OVER_EVENT = 'gameOver'

// 2. HUD_UPDATE_EVENT / BLASTER_READY_EVENT — added 2026-09-08 so the large
// side-panel status readout (src/game/PlaySidePanels.tsx) can mirror in-game
// state in the open space either side of the portrait canvas. This supersedes
// the earlier "in-game HUD stays inside Phaser" decision recorded in
// docs/architecture.md — that panel now needs a live read of health/score/
// active power-ups, not just the one-time GameOver payload. PlayScene emits
// HUD_UPDATE_EVENT every frame (a small POJO, not an allocation-sensitive
// per-frame concern); the sour-blaster PowerUpDef's onApply emits
// BLASTER_READY_EVENT once per pickup for the "SPACE TO SHOOT!" flash.
export interface HudPowerUp {
  id: string
  label: string
  remainingFraction: number
}

export interface HudState {
  health: number
  maxHealth: number
  score: number
  powerUps: HudPowerUp[]
}

export const HUD_UPDATE_EVENT = 'hudUpdate'
export const BLASTER_READY_EVENT = 'blasterReady'

export const eventBus = new Phaser.Events.EventEmitter()
