import Phaser from 'phaser'

import type { Obstacle } from '../entities/Obstacle'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "max health"). Placeholder starting/maximum health.
const MAX_HEALTH = 3

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "invulnerability window"). Post-hit grace period during which further hits
// deal no damage and don't re-trigger the timer.
const INVULN_MS = 1000

// Generic, data-driven health tracker (see docs/game-design.md "Health,
// power-up, and spawn systems"). Event-driven: listens for `playerHit` and
// emits `healthChanged` / `gameOver` on the scene event emitter (see
// docs/architecture.md "Engine patterns"). No per-frame update involvement.
export class HealthSystem {
  private readonly scene: Phaser.Scene
  private health = MAX_HEALTH
  private invulnerable = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.events.on('playerHit', this.onPlayerHit, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('playerHit', this.onPlayerHit, this)
    })
  }

  get current(): number {
    return this.health
  }

  private onPlayerHit(obstacle: Obstacle) {
    if (this.invulnerable) {
      return
    }

    this.health -= obstacle.damage
    this.invulnerable = true
    this.scene.time.delayedCall(INVULN_MS, () => {
      this.invulnerable = false
    })

    this.scene.events.emit('healthChanged', this.health)

    if (this.health <= 0) {
      this.scene.events.emit('gameOver')
    }
  }
}
