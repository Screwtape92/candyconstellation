import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { SpawnEntry } from '../data/spawnTable'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Shared base downward speed; each entry's optional speedMultiplier scales it.
// Phase 3.2's difficulty curve replaces this constant with the per-run
// obstacleSpeed(t) value. Arcade Physics integrates this per-second velocity
// against real frame delta, so it's frame-rate independent.
export const BASE_FALL_SPEED = 220

// How long the hit flash lasts before the obstacle is destroyed.
const HIT_FLASH_MS = 120

// Generic obstacle driven entirely by its SpawnEntry — no branching on
// specific ids (see docs/dev-standards.md "no god-files"). Obstacles vary by
// type (texture size, damage, speed), so this uses create-on-spawn /
// destroy-when-off-screen rather than by-type pooling; the strict no-per-frame-
// allocation budget in docs/architecture.md is a Phase 8 launch-readiness
// concern, not a Phase 3 blocker. Never orphaned: every path ends in destroy().
export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number

  private readonly fallSpeed: number
  private isHit = false

  constructor(scene: Phaser.Scene, entry: SpawnEntry, x: number) {
    super(scene, x, 0, entry.spriteKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.damage = entry.damage ?? 0
    this.fallSpeed = BASE_FALL_SPEED * (entry.speedMultiplier ?? 1)

    // Clamp horizontally to stay fully on-screen, and start just above the top.
    const halfWidth = this.displayWidth / 2
    this.setPosition(
      Phaser.Math.Clamp(x, halfWidth, GAME_WIDTH - halfWidth),
      -this.displayHeight,
    )
  }

  // Must be called AFTER adding to a physics group: Phaser.Physics.Arcade.Group
  // re-applies its body defaults (including velocityY: 0) on Group.add(), which
  // would clobber a velocity set any earlier — so velocity is asserted here.
  launch() {
    this.setVelocityY(this.fallSpeed)
  }

  update() {
    if (this.y > GAME_HEIGHT + this.displayHeight) {
      this.destroy()
    }
  }

  // Temporary hit feedback (throwaway scaffolding). Guards against the overlap
  // callback firing every frame during contact, flashes, then destroys.
  flashAndDestroy() {
    if (this.isHit) {
      return
    }
    this.isHit = true
    this.setTint(0xff5555)
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      this.destroy()
    })
  }
}
