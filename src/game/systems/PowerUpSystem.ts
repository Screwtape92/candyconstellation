import Phaser from 'phaser'

import { powerUps, type PowerUpDef } from '../data/powerUps'
import type { Collectible } from '../entities/Collectible'
import type { Player } from '../entities/Player'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Candy Magnet pull radius and pull speed. Range is a fraction of the 960px-
// tall canvas so a pickup a bit above the ship gets drawn in; speed is well
// above the fall speed so in-range candy visibly homes toward the player.
const MAGNET_RANGE_PX = 220
const MAGNET_PULL_SPEED = 300

// Drives every power-up row from data/powerUps.ts through one generic path (see
// docs/game-design.md "Power-ups"). Applies a PowerUpDef on pickup and, for
// timed effects, schedules its expiry via the Clock API (docs/architecture.md
// "Timed/duration triggers" — same pattern as HealthSystem's invuln window).
// The Candy Magnet's per-frame pull lives here too, driven from
// PlayScene.update(); it reads the player's magnetActive flag rather than
// reaching into another system.
export class PowerUpSystem {
  private readonly scene: Phaser.Scene
  private readonly player: Player
  // One live expiry timer per active timed power-up, keyed by id, so 'refresh'
  // can reset it and 'ignore' can detect an active window. Instant effects
  // (durationMs 0) never enter this map.
  private readonly timers = new Map<string, Phaser.Time.TimerEvent>()

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.timers.forEach((timer) => timer.remove())
      this.timers.clear()
    })
  }

  // Applies the power-up whose PowerUpDef.id matches `id` (the pickup carries
  // this id from its spawn-table row). No-op if no def matches.
  apply(id: string) {
    const def = powerUps.find((entry) => entry.id === id)
    if (!def) {
      return
    }

    // Instant effect (e.g. Candy Heart): apply once, no timer, no stacking
    // bookkeeping. 'stack' semantics fall out for free — every pickup just
    // re-runs onApply.
    if (def.durationMs <= 0) {
      def.onApply(this.player)
      return
    }

    this.applyTimed(def)
  }

  private applyTimed(def: PowerUpDef) {
    const active = this.timers.get(def.id)

    // 'ignore': a second pickup while active does nothing.
    if (active && def.stacking === 'ignore') {
      return
    }

    def.onApply(this.player)

    // 'refresh': drop the running timer so we reschedule a single fresh window
    // rather than leaving two timers racing to fire onExpire.
    if (active && def.stacking === 'refresh') {
      active.remove()
    }

    const timer = this.scene.time.delayedCall(
      def.durationMs,
      () => {
        def.onExpire(this.player)
        this.timers.delete(def.id)
      },
      undefined,
      this,
    )
    this.timers.set(def.id, timer)
  }

  // Candy Magnet's per-frame pull, called from PlayScene.update() with the
  // collectibles group. While the player's magnet flag is set, in-range
  // collectibles are steered toward the player via Arcade Physics'
  // moveToObject (re-aimed each frame so they home in). A radius check here is
  // a gameplay effect, not collision/trigger detection, so it's a distance
  // check rather than an overlap callback (docs/architecture.md "Engine
  // patterns" scopes the no-manual-distance rule to trigger detection).
  updateMagnet(collectibles: Phaser.Physics.Arcade.Group) {
    if (!this.player.magnetActive) {
      return
    }
    collectibles.getChildren().forEach((child) => {
      const candy = child as Collectible
      if (!candy.active) {
        return
      }
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        candy.x,
        candy.y,
      )
      if (distance <= MAGNET_RANGE_PX) {
        this.scene.physics.moveToObject(candy, this.player, MAGNET_PULL_SPEED)
      }
    })
  }
}
