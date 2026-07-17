import Phaser from 'phaser'

import { OBSTACLE_SIZE, OBSTACLE_TEXTURE_KEY } from '../entities/Obstacle'
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

  // Placeholder art until real sprites are wired in — flat shapes stand in for
  // the ship and obstacle so movement/collision can be built and playtested now.
  private generatePlaceholderTextures() {
    this.generateSquareTexture(PLAYER_TEXTURE_KEY, PLAYER_SIZE, 0x8be9fd)
    this.generateSquareTexture(OBSTACLE_TEXTURE_KEY, OBSTACLE_SIZE, 0xff79c6)
  }

  private generateSquareTexture(key: string, size: number, color: number) {
    if (this.textures.exists(key)) {
      return
    }
    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, size, size)
    graphics.generateTexture(key, size, size)
    graphics.destroy()
  }
}
