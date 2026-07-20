import Phaser from 'phaser'

// The single Phaser->React crossing (docs/architecture.md "React ⇄ Phaser
// integration"): "Only the GameOver transition crosses back to React, via a
// small EventBus: { score, elapsedSec }." One-directional and one-time-per-run
// — GameOverScene emits once when a run ends, the React shell listens to drive
// the post-game (name entry / score submission / leaderboard) flow.
//
// This is deliberately NOT the in-scene emitter (scene.events) used for
// system-to-system signaling within PlayScene (docs/architecture.md "Engine
// patterns"); it exists solely to cross the engine boundary. It reuses Phaser's
// own EventEmitter (already a dependency) rather than adding a pub/sub library,
// matching the project's "don't reach for a new library" convention for events.
export interface GameOverPayload {
  score: number
  elapsedSec: number
}

export const GAME_OVER_EVENT = 'gameOver'

export const eventBus = new Phaser.Events.EventEmitter()
