import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Player } from '../entities/Player'

export class PlayScene extends Phaser.Scene {
  private player!: Player

  constructor() {
    super('PlayScene')
  }

  create() {
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.75)
  }

  update() {
    this.player.update()
  }
}
