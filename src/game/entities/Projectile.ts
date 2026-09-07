import Phaser from 'phaser'

import { spriteArtSize } from '../data/sprites'

export const PROJECTILE_TEXTURE_KEY = 'sour-blaster-bolt'

// Sour Blaster's projectile (docs/game-design.md "Power-ups"): spawned by
// BlasterSystem on fire input, travels straight up (against the scroll
// direction), and is consumed on its first obstacle overlap — no piercing
// (see PlayScene's projectile/obstacle overlap handler). Otherwise the same
// create-then-destroy-off-screen shape as every other entity here, just
// moving the opposite way.
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, speed: number) {
    super(scene, x, y, PROJECTILE_TEXTURE_KEY)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const art = spriteArtSize(PROJECTILE_TEXTURE_KEY)
    if (art) {
      this.setBodySize(art.w, art.h)
    }

    this.setVelocityY(-speed)
  }

  update() {
    if (this.y < -this.displayHeight) {
      this.destroy()
    }
  }
}
