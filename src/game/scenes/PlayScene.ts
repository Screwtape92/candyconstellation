import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Obstacle } from '../entities/Obstacle'
import { Player } from '../entities/Player'
import { HealthSystem } from '../systems/HealthSystem'

export class PlayScene extends Phaser.Scene {
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.Group
  private healthSystem!: HealthSystem
  private healthText!: Phaser.GameObjects.Text

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
        // HealthSystem listens for this event to apply damage/invulnerability;
        // it also still drives the temporary hit flash for now.
        this.events.emit('playerHit', hit)
        hit.flashAndRecycle()
      },
    )

    this.healthSystem = new HealthSystem(this)

    this.healthText = this.add.text(
      16,
      16,
      `Health: ${this.healthSystem.current}`,
      { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' },
    )

    const onHealthChanged = (health: number) => {
      this.healthText.setText(`Health: ${health}`)
    }
    this.events.on('healthChanged', onHealthChanged)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('healthChanged', onHealthChanged)
    })

    // HealthSystem emits gameOver on health <= 0. Per the state machine in
    // docs/game-design.md, transition to GameOverScene. scene.start shuts this
    // scene down (firing SHUTDOWN, which triggers this scene's and
    // HealthSystem's listener cleanup and clears pending timers), so a fresh
    // run starts clean rather than leaking across consecutive restarts.
    this.events.once('gameOver', () => {
      this.scene.start('GameOverScene')
    })
  }

  update() {
    this.player.update()
    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Obstacle
      obstacle.update()
    })
  }
}
