import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { PARTICLE_TEXTURE_KEY } from '../systems/JuiceSystem'
import {
  BG_FAR_TEXTURE_KEY,
  BG_NEAR_TEXTURE_KEY,
} from '../systems/ParallaxBackground'
import {
  bakeSpriteTextures,
  generateParticleTexture,
  queueSpriteLoads,
} from '../textures'

const PARTICLE_RADIUS = 6

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  preload() {
    this.showLoadingBar()
    queueSpriteLoads(this)
    // The two parallax background layers (docs/game-design.md "Visual
    // readability" extension, 2026-09-07) — user-supplied art, pre-sized to
    // the exact game canvas (720x960) so the full composition is visible
    // before a TileSprite needs to wrap (see scripts/optimize-backgrounds.mjs).
    this.load.image(BG_FAR_TEXTURE_KEY, '/assets/backgrounds/space-far.webp')
    this.load.image(BG_NEAR_TEXTURE_KEY, '/assets/backgrounds/space-near.webp')
  }

  // Async because baking round-trips each sprite through an image decode (see
  // addImageTexture in src/game/textures.ts). Phaser does not await create(),
  // which is fine: nothing renders until PlayScene starts, and that only
  // happens once every texture is registered.
  async create() {
    // Sprite art is baked from the loaded pack PNGs (trim, fit, recolor) and
    // the procedural entries drawn, all in src/game/textures.ts. Everything
    // downstream still sizes itself from the resulting texture.
    await bakeSpriteTextures(this)
    generateParticleTexture(this, PARTICLE_TEXTURE_KEY, PARTICLE_RADIUS)

    this.scene.start('PlayScene')
  }

  // Real assets are small (a handful of PNGs plus two ~15KB background WebPs,
  // well under the load-time budget in docs/architecture.md), but a bare
  // black canvas during load reads as broken on a slow connection, so the
  // progress bar exists to say "it is working".
  private showLoadingBar() {
    const barWidth = GAME_WIDTH * 0.5
    const barHeight = 16
    const x = (GAME_WIDTH - barWidth) / 2
    const y = GAME_HEIGHT / 2

    const frame = this.add.graphics()
    frame.lineStyle(2, 0x8be9fd, 0.8)
    frame.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4)

    const fill = this.add.graphics()
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      fill.clear()
      fill.fillStyle(0x8be9fd, 1)
      fill.fillRect(x, y, barWidth * progress, barHeight)
    })
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      fill.destroy()
      frame.destroy()
    })
  }
}
