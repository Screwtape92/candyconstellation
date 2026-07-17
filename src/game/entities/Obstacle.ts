import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'

export const OBSTACLE_TEXTURE_KEY = 'obstacle'
export const OBSTACLE_SIZE = 40

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Single hardcoded placeholder speed; the real per-run value comes from the
// difficulty curve + spawn table in Phase 3. Arcade Physics integrates this
// per-second velocity against real frame delta, so it's frame-rate independent.
const FALL_SPEED = 220

// How long the hit flash lasts before the obstacle recycles. Throwaway
// scaffolding — Phase 2.3's HealthSystem replaces this feedback.
const HIT_FLASH_MS = 120

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  private isHit = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, OBSTACLE_TEXTURE_KEY)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setVelocityY(FALL_SPEED)
    this.recycle()
  }

  update() {
    if (this.y > GAME_HEIGHT + OBSTACLE_SIZE) {
      this.recycle()
    }
  }

  // Temporary hit feedback (throwaway — see HIT_FLASH_MS). Guards against the
  // overlap callback firing every frame during contact, flashes, then recycles.
  flashAndRecycle() {
    if (this.isHit) {
      return
    }
    this.isHit = true
    this.setTint(0xff5555)
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      this.clearTint()
      this.recycle()
    })
  }

  // Reposition above the top of the canvas at a random horizontal offset so a
  // single obstacle keeps falling forever without leaking or drifting away.
  // Public: Phaser.Physics.Arcade.Group re-applies its defaults (including
  // velocityY: 0) to any body added via Group.add(), even one that already
  // has a body with velocity set — so the caller must call this again right
  // after adding this obstacle to a physics group, or it'll spawn frozen.
  recycle() {
    this.isHit = false
    this.setPosition(
      Phaser.Math.Between(OBSTACLE_SIZE, GAME_WIDTH - OBSTACLE_SIZE),
      -OBSTACLE_SIZE,
    )
    this.setVelocityY(FALL_SPEED)
  }
}
