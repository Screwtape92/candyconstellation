import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Obstacle } from '../entities/Obstacle'
import { Player } from '../entities/Player'

export class PlayScene extends Phaser.Scene {
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.Group

  constructor() {
    super('PlayScene')
  }

  create() {
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.75)

    // One physics group for obstacles (group is the convention, not the count —
    // Phase 3's SpawnSystem populates it from the data-driven spawn table).
    this.obstacles = this.physics.add.group()
    const obstacle = new Obstacle(this, 0, 0)
    this.obstacles.add(obstacle)
    // Group.add() re-applies group defaults (incl. velocityY: 0), clobbering
    // the velocity/position the constructor just set — reassert after adding.
    obstacle.recycle()

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      (_player, obstacle) => {
        const hit = obstacle as Obstacle
        // Phase 2.3's HealthSystem will listen for this same event to apply
        // real damage/invulnerability; for now it drives the temporary flash.
        this.events.emit('playerHit', hit)
        hit.flashAndRecycle()
      },
    )
  }

  update() {
    this.player.update()
    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Obstacle
      obstacle.update()
    })
  }
}
