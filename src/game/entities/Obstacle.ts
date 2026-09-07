import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { SpawnEntry } from '../data/spawnTable'
import { spinFor, spriteArtSize } from '../data/sprites'

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
  private readonly spinDegPerSec: number
  private isHit = false

  // baseSpeed is the difficulty curve's obstacleSpeed(t) sampled at spawn time
  // (see docs/game-design.md "Difficulty curve"); each entry's optional
  // speedMultiplier scales it. Fixed at construction — an obstacle already in
  // flight is not re-accelerated; only newly-spawned ones reflect the higher t.
  // Arcade Physics integrates this per-second velocity against real frame
  // delta, so it's frame-rate independent.
  constructor(
    scene: Phaser.Scene,
    entry: SpawnEntry,
    x: number,
    baseSpeed: number,
  ) {
    super(scene, x, 0, entry.spriteKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.damage = entry.damage ?? 0
    this.fallSpeed = baseSpeed * (entry.speedMultiplier ?? 1)
    this.spinDegPerSec = spinFor(entry.spriteKey)

    // The texture frame is padded so rotation does not clip the art (see
    // frameSize in src/game/textures.ts), so the body and the on-screen clamp
    // both come from the art size � otherwise the padding would silently widen
    // the playtested hitbox and pull spawns away from the walls.
    const art = spriteArtSize(entry.spriteKey)
    if (art) {
      this.setBodySize(art.w, art.h)
    }

    // Clamp horizontally to stay fully on-screen, and start just above the top.
    const halfWidth = (art?.w ?? this.displayWidth) / 2
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
    // Idle spin stands in for the per-entity loop animations the Kenney packs
    // do not have (see src/game/data/sprites.ts). Asserted here for the same
    // reason as the velocity above. Arcade bodies stay axis-aligned, so this is
    // purely visual and leaves the playtested hitbox untouched.
    this.setAngularVelocity(this.spinDegPerSec)
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
