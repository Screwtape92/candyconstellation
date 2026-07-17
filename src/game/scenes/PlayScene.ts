import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Collectible } from '../entities/Collectible'
import { Obstacle } from '../entities/Obstacle'
import { Player } from '../entities/Player'
import { PowerUp } from '../entities/PowerUp'
import { HealthSystem } from '../systems/HealthSystem'
import { JuiceSystem } from '../systems/JuiceSystem'
import { PowerUpSystem } from '../systems/PowerUpSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'

export class PlayScene extends Phaser.Scene {
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.Group
  private collectibles!: Phaser.Physics.Arcade.Group
  private powerups!: Phaser.Physics.Arcade.Group
  private spawnSystem!: SpawnSystem
  private healthSystem!: HealthSystem
  private powerUpSystem!: PowerUpSystem
  private scoreSystem!: ScoreSystem
  private healthText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text

  constructor() {
    super('PlayScene')
  }

  create() {
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.75)

    // One physics group per kind (docs/architecture.md "Engine patterns"). The
    // SpawnSystem populates all three from the single data-driven spawn table,
    // routing each row to the group matching its kind.
    this.obstacles = this.physics.add.group()
    this.collectibles = this.physics.add.group()
    this.powerups = this.physics.add.group()
    this.spawnSystem = new SpawnSystem(this, {
      obstacle: this.obstacles,
      collectible: this.collectibles,
      powerup: this.powerups,
    })
    this.spawnSystem.start()

    // One overlap callback per group pair (docs/architecture.md "Engine
    // patterns") — a separate handler for collectibles, not a branch inside the
    // obstacle one.
    this.physics.add.overlap(
      this.player,
      this.obstacles,
      (_player, obstacle) => {
        const hit = obstacle as Obstacle
        // HealthSystem listens for this event to apply damage/invulnerability;
        // it also still drives the temporary hit flash for now.
        this.events.emit('playerHit', hit)
        hit.flashAndDestroy()
      },
    )

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (_player, collectible) => {
        const candy = collectible as Collectible
        // collect() returns true only on the first frame of contact, so value
        // is counted once. The ScoreSystem (Phase 3.5) will listen for
        // candyCollected — same emit-an-event pattern as playerHit above.
        if (candy.collect()) {
          // ScoreSystem reads .value; JuiceSystem reads x/y to float a "+N"
          // score popup at the pickup point (collectibles only — power-ups
          // carry no score value, so they never get a popup).
          this.events.emit('candyCollected', {
            value: candy.value,
            x: candy.x,
            y: candy.y,
          })
          // Position-carrying sibling of candyCollected, for the particle burst
          // — shared with power-up pickups, which have no score value.
          this.events.emit('pickupBurst', { x: candy.x, y: candy.y })
        }
      },
    )

    // One overlap callback per group pair — power-ups get their own handler,
    // not a branch inside another. PowerUpSystem looks up the effect by the
    // pickup's id and applies it; collect() gates the apply to the first frame
    // of contact so a timed effect isn't re-applied every overlap frame.
    this.physics.add.overlap(this.player, this.powerups, (_player, powerup) => {
      const pickup = powerup as PowerUp
      if (pickup.collect()) {
        this.powerUpSystem.apply(pickup.id)
        this.events.emit('pickupBurst', { x: pickup.x, y: pickup.y })
      }
    })

    this.healthSystem = new HealthSystem(this)
    this.powerUpSystem = new PowerUpSystem(this, this.player)
    // Event-driven with no per-frame work and no external callers, so it needs
    // no field — the scene event emitter retains it (via its bound listeners)
    // for the scene's lifetime. Listens for playerDamaged (hit-stop + shake +
    // burst) and pickupBurst (burst only) — see docs/game-design.md "Feel &
    // experience".
    new JuiceSystem(this)
    // ScoreSystem listens for candyCollected (emitted above); start() zeroes its
    // clock so elapsed-time scoring begins now, same as SpawnSystem.
    this.scoreSystem = new ScoreSystem(this)
    this.scoreSystem.start()

    this.healthText = this.add.text(
      16,
      16,
      `Health: ${this.healthSystem.current}`,
      { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' },
    )

    // Unlike Health (event-driven), the score's survival term changes every
    // frame, so this readout is refreshed in update() rather than on an event.
    this.scoreText = this.add.text(
      16,
      44,
      `Score: ${this.scoreSystem.current}`,
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
      this.scene.start('GameOverScene', { score: this.scoreSystem.current })
    })
  }

  update() {
    this.scoreText.setText(`Score: ${this.scoreSystem.current}`)
    this.player.update()
    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Obstacle
      obstacle.update()
    })
    this.collectibles.getChildren().forEach((child) => {
      const collectible = child as Collectible
      collectible.update()
    })
    this.powerups.getChildren().forEach((child) => {
      const powerup = child as PowerUp
      powerup.update()
    })
    this.powerUpSystem.updateMagnet(this.collectibles)
  }
}
