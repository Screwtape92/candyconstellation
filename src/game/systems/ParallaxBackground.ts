import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'

export const BG_FAR_TEXTURE_KEY = 'bg-far'
export const BG_NEAR_TEXTURE_KEY = 'bg-near'

// Behind everything, but still ordered relative to each other.
const FAR_DEPTH = -20
const NEAR_DEPTH = -19

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Scroll speed in px/sec. Both are well under the obstacle fall speed so the
// backdrop reads as distant rather than competing with the hazards for the
// eye; the near layer moves ~2.6x the far one, which is the parallax.
const FAR_SPEED = 18
const NEAR_SPEED = 48

/**
 * The two scrolling starfield layers (docs/asset-spec.md "Background"). Scrolls
 * downward, so the player reads as flying up. Both layers are TileSprites over
 * seamlessly-tiling generated textures, so this is two texture-offset writes
 * per frame with no object churn — nothing that touches the per-frame
 * allocation budget in docs/architecture.md.
 */
export class ParallaxBackground {
  private readonly far: Phaser.GameObjects.TileSprite
  private readonly near: Phaser.GameObjects.TileSprite

  constructor(scene: Phaser.Scene) {
    this.far = this.addLayer(scene, BG_FAR_TEXTURE_KEY, FAR_DEPTH)
    this.near = this.addLayer(scene, BG_NEAR_TEXTURE_KEY, NEAR_DEPTH)
  }

  update(delta: number) {
    const seconds = delta / 1000
    // Decreasing the tile offset moves the texture down the screen; TileSprite
    // wraps it, and the textures tile seamlessly, so this never needs resetting.
    this.far.tilePositionY -= FAR_SPEED * seconds
    this.near.tilePositionY -= NEAR_SPEED * seconds
  }

  private addLayer(scene: Phaser.Scene, key: string, depth: number) {
    return scene.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, key)
      .setDepth(depth)
  }
}
