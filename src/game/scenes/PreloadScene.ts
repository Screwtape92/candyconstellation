import Phaser from 'phaser'

import { PLAYER_SIZE, PLAYER_TEXTURE_KEY } from '../entities/Player'

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

  // Placeholder art until real sprites are wired in — a flat square stands in
  // for the ship so movement can be built and playtested now.
  private generatePlaceholderTextures() {
    if (this.textures.exists(PLAYER_TEXTURE_KEY)) {
      return
    }
    const graphics = this.make.graphics()
    graphics.fillStyle(0x8be9fd, 1)
    graphics.fillRect(0, 0, PLAYER_SIZE, PLAYER_SIZE)
    graphics.generateTexture(PLAYER_TEXTURE_KEY, PLAYER_SIZE, PLAYER_SIZE)
    graphics.destroy()
  }
}
