import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { Collectible } from '../entities/Collectible'
import { Obstacle } from '../entities/Obstacle'
import { Player } from '../entities/Player'
import { PowerUp } from '../entities/PowerUp'
import type { Projectile } from '../entities/Projectile'
import { BlasterSystem, PROJECTILE_DAMAGE } from '../systems/BlasterSystem'
import { HealthSystem } from '../systems/HealthSystem'
import { JuiceSystem } from '../systems/JuiceSystem'
import { ParallaxBackground } from '../systems/ParallaxBackground'
import { PowerUpBadges } from '../systems/PowerUpBadges'
import { PowerUpHud } from '../systems/PowerUpHud'
import { PowerUpSystem } from '../systems/PowerUpSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { SpawnSystem } from '../systems/SpawnSystem'

export class PlayScene extends Phaser.Scene {
  private background!: ParallaxBackground
  private player!: Player
  private obstacles!: Phaser.Physics.Arcade.Group
  private collectibles!: Phaser.Physics.Arcade.Group
  private powerups!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private spawnSystem!: SpawnSystem
  private healthSystem!: HealthSystem
  private powerUpSystem!: PowerUpSystem
  private powerUpHud!: PowerUpHud
  private powerUpBadges!: PowerUpBadges
  private blasterSystem!: BlasterSystem
  private scoreSystem!: ScoreSystem
  private healthText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text

  constructor() {
    super('PlayScene')
  }

  create() {
    // First, so the starfield sits behind everything added after it (its own
    // depth keeps it there regardless, but creation order matches intent).
    this.background = new ParallaxBackground(this)

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT * 0.75)

    // One physics group per kind (docs/architecture.md "Engine patterns"). The
    // SpawnSystem populates all three from the single data-driven spawn table,
    // routing each row to the group matching its kind.
    this.obstacles = this.physics.add.group()
    this.collectibles = this.physics.add.group()
    this.powerups = this.physics.add.group()
    this.projectiles = this.physics.add.group()
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

    // Sour Blaster's projectile-vs-obstacle collision (docs/game-design.md
    // "Power-ups" / "Obstacle durability"). Consumed on impact — no piercing
    // — so a single shot can only ever destroy one obstacle.
    this.physics.add.overlap(
      this.projectiles,
      this.obstacles,
      (projectile, obstacle) => {
        const shot = projectile as Projectile
        const hit = obstacle as Obstacle
        if (!shot.active || !hit.active) {
          return
        }
        shot.destroy()
        if (hit.takeProjectileHit(PROJECTILE_DAMAGE)) {
          this.events.emit('obstacleDestroyed', { x: hit.x, y: hit.y })
        }
      },
    )

    this.healthSystem = new HealthSystem(this)
    this.powerUpSystem = new PowerUpSystem(this, this.player)
    this.powerUpHud = new PowerUpHud(this)
    this.powerUpBadges = new PowerUpBadges(this, this.player)
    this.blasterSystem = new BlasterSystem(this, this.player, this.projectiles)
    // Event-driven with no per-frame work and no external callers, so it needs
    // no field — the scene event emitter retains it (via its bound listeners)
    // for the scene's lifetime. Listens for playerDamaged (hit-stop + shake +
    // burst) and pickupBurst (burst only) — see docs/game-design.md "Feel &
    // experience".
    new JuiceSystem(this)
    // ScoreSystem listens for candyCollected (emitted above); its elapsedSec
    // reads Phaser's own Clock.startTime, so there's no separate start() call
    // needed to zero its clock (see ScoreSystem.elapsedSec).
    this.scoreSystem = new ScoreSystem(this)

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
    // docs/game-design.md, transition to GameOverScene — paused, not stopped,
    // and launched as an overlay rather than replacing this scene, so the
    // frozen field of obstacles/candy stays visible behind the game-over beat
    // instead of cutting to a blank scene (classic-arcade "everything freezes,
    // GAME OVER slams on screen"). pause() halts this scene's update loop,
    // which also freezes its Arcade Physics world and Tweens/Time systems, so
    // nothing keeps drifting behind the overlay. No stop+start cleanup needed
    // here the way the old comment warned: React destroys the whole
    // Phaser.Game the instant GameOverScene hands off to it (PhaserGame.tsx
    // unmounts on the eventBus emit), so there's nothing left for a leaked
    // listener/timer to leak into.
    this.events.once('gameOver', () => {
      this.scene.pause()
      this.scene.launch('GameOverScene', {
        score: this.scoreSystem.current,
        elapsedSec: this.scoreSystem.elapsedSec,
      })
    })
  }

  update(_time: number, delta: number) {
    this.background.update(delta)
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
    this.projectiles.getChildren().forEach((child) => {
      const projectile = child as Projectile
      projectile.update()
    })
    this.powerUpSystem.updateMagnet(this.collectibles)
    this.blasterSystem.update()
    const activeTimers = this.powerUpSystem.activeTimers()
    this.powerUpHud.update(activeTimers)
    this.powerUpBadges.update(activeTimers.map((entry) => entry.id))
  }
}
