import Phaser from 'phaser'

import { spawnTable } from '../data/spawnTable'
import { PLAYER_SIZE, PLAYER_TEXTURE_KEY } from '../entities/Player'

// Throwaway placeholder appearance per spriteKey — distinct color/size so the
// content types are tellable apart while playtesting (obstacles vs collectibles
// especially, per the visual-readability constraint in docs/game-design.md
// "Feel & experience"). Replaced by real PixelLab sprites in Phase 7.
// jawbreaker is the big block; the tall sour-comet rectangle previews its baked
// trailing tail / taller hitbox. Collectibles are smaller and use a separate
// bright palette from the obstacle colors so candy reads as pickup-not-hazard
// at a glance. Not gameplay data — real size comes from the sprite.
type PlaceholderShape = { w: number; h: number; color: number }

const PLACEHOLDERS: Record<string, PlaceholderShape> = {
  // obstacles
  'gummy-meteor': { w: 40, h: 40, color: 0xff79c6 },
  jawbreaker: { w: 56, h: 56, color: 0xffb86c },
  'sour-comet': { w: 24, h: 60, color: 0x50fa7b },
  // collectibles
  'hop-nebula-dust': { w: 26, h: 26, color: 0xbd93f9 },
  'malt-meteorite': { w: 26, h: 26, color: 0xf1fa8c },
  'candy-star': { w: 26, h: 26, color: 0xf8f8f2 },
  // power-ups — a separate palette again (strong blue / red) so the two bonus
  // pickups read as distinct from obstacles, collectibles, and each other.
  'candy-magnet': { w: 30, h: 30, color: 0x2d7dff },
  'candy-heart': { w: 30, h: 30, color: 0xff2d55 },
}

const DEFAULT_PLACEHOLDER: PlaceholderShape = {
  w: 40,
  h: 40,
  color: 0xaaaaaa,
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  preload() {
    // No real assets yet (sprites/audio arrive in a later phase). A load
    // progress bar belongs here once there is something to load.
  }

  create() {
    this.generatePlaceholderTextures()
    this.scene.start('PlayScene')
  }

  // Placeholder art until real sprites are wired in — flat shapes stand in for
  // the ship and each obstacle type so movement/collision/spawning can be
  // built and playtested now.
  private generatePlaceholderTextures() {
    this.generateRectTexture(
      PLAYER_TEXTURE_KEY,
      PLAYER_SIZE,
      PLAYER_SIZE,
      0x8be9fd,
    )

    for (const entry of spawnTable) {
      const shape = PLACEHOLDERS[entry.spriteKey] ?? DEFAULT_PLACEHOLDER
      this.generateRectTexture(entry.spriteKey, shape.w, shape.h, shape.color)
    }
  }

  private generateRectTexture(
    key: string,
    width: number,
    height: number,
    color: number,
  ) {
    if (this.textures.exists(key)) {
      return
    }
    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, width, height)
    graphics.generateTexture(key, width, height)
    graphics.destroy()
  }
}
