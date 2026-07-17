import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { SpawnEntry } from '../data/spawnTable'

// How long the pickup pop/fade plays before the collectible is destroyed.
const COLLECT_MS = 120

// Generic collectible driven entirely by its SpawnEntry — no branching on
// specific ids (see docs/dev-standards.md "no god-files"). Same
// create-on-spawn / destroy-when-off-screen shape as Obstacle (frame-rate
// independent via Arcade velocity), but it carries a score `value` instead of
// `damage` and has no hit flash — on pickup it just pops and disappears. Never
// orphaned: every path ends in destroy().
export class Collectible extends Phaser.Physics.Arcade.Sprite {
  readonly value: number

  private readonly fallSpeed: number
  private isCollected = false

  // baseSpeed is the difficulty curve's obstacleSpeed(t) sampled at spawn time
  // (see docs/game-design.md "Difficulty curve"); collectibles reuse the same
  // curve as obstacles, scaled by the optional per-entry speedMultiplier (none
  // set on the MVP collectible rows, so they fall at the raw curve). Fixed at
  // construction; Arcade Physics integrates this per-second velocity against
  // real frame delta, so it's frame-rate independent.
  constructor(
    scene: Phaser.Scene,
    entry: SpawnEntry,
    x: number,
    baseSpeed: number,
  ) {
    super(scene, x, 0, entry.spriteKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.value = entry.value ?? 0
    this.fallSpeed = baseSpeed * (entry.speedMultiplier ?? 1)

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

  // Returns true only on the first call so the caller emits/counts the score
  // value exactly once, even though the overlap callback can fire on several
  // frames before the pop/fade tween finishes destroying this. Disables the
  // body so it stops falling and stops overlapping the player while it fades.
  // Temporary pickup feedback (throwaway scaffolding) — real VFX is Phase 4/7.
  collect(): boolean {
    if (this.isCollected) {
      return false
    }
    this.isCollected = true
    this.disableBody(false, false)
    this.scene.tweens.add({
      targets: this,
      scale: 1.4,
      alpha: 0,
      duration: COLLECT_MS,
      onComplete: () => {
        this.destroy()
      },
    })
    return true
  }
}
