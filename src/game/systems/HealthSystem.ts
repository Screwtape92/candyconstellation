import Phaser from 'phaser'

import type { Obstacle } from '../entities/Obstacle'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "max health"). Placeholder starting/maximum health.
export const MAX_HEALTH = 3

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "invulnerability window"). Post-hit grace period during which further hits
// deal no damage and don't re-trigger the timer.
export const INVULN_MS = 1000

// Generic, data-driven health tracker (see docs/game-design.md "Health,
// power-up, and spawn systems"). Event-driven: listens for `playerHit` and
// emits `healthChanged` / `gameOver` on the scene event emitter (see
// docs/architecture.md "Engine patterns"). No per-frame update involvement.
export class HealthSystem {
  private readonly scene: Phaser.Scene
  private health = MAX_HEALTH
  private invulnerable = false
  // Sugar Shield's flag, mirrored here via `shieldChanged` rather than read
  // directly off Player (docs/game-design.md "Power-ups") — kept as its own
  // boolean, independent of `invulnerable`, specifically so the two grace
  // windows can't cancel each other: a hit taken just before the shield lands
  // must not have the shield's later expiry clear the post-hit window early,
  // and the shield expiring must not cancel a post-hit window still running.
  private shielded = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.events.on('playerHit', this.onPlayerHit, this)
    // Candy Heart restores health by emitting `heal` — systems talk via events,
    // not direct method calls (docs/architecture.md "Engine patterns").
    scene.events.on('heal', this.heal, this)
    scene.events.on('shieldChanged', this.onShieldChanged, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('playerHit', this.onPlayerHit, this)
      scene.events.off('heal', this.heal, this)
      scene.events.off('shieldChanged', this.onShieldChanged, this)
    })
  }

  get current(): number {
    return this.health
  }

  // Restores health, capped at MAX_HEALTH, and emits healthChanged so the HUD
  // reflects the restore (same event the "Health: N" text already listens for).
  // A full-health player picking up a Candy Heart is a no-op increase but still
  // re-emits — harmless and keeps the path branch-free.
  heal(amount: number) {
    this.health = Math.min(MAX_HEALTH, this.health + amount)
    this.scene.events.emit('healthChanged', this.health)
  }

  private onShieldChanged(active: boolean) {
    this.shielded = active
  }

  private onPlayerHit(obstacle: Obstacle) {
    if (this.invulnerable || this.shielded) {
      return
    }

    this.health -= obstacle.damage
    this.invulnerable = true
    this.scene.time.delayedCall(INVULN_MS, () => {
      this.invulnerable = false
    })

    // Distinct from `playerHit` (which fires on every overlap frame regardless
    // of invuln state): `playerDamaged` fires only when damage is actually
    // applied, and carries the impact point so JuiceSystem can burst there.
    this.scene.events.emit('playerDamaged', { x: obstacle.x, y: obstacle.y })

    this.scene.events.emit('healthChanged', this.health)

    if (this.health <= 0) {
      this.scene.events.emit('gameOver')
    }
  }
}
