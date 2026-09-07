import Phaser from 'phaser'

import type { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables
// appendix"). Fire rate cooldown, projectile speed, and per-hit damage for
// Sour Blaster.
export const FIRE_COOLDOWN_MS = 250
export const PROJECTILE_SPEED = 700
export const PROJECTILE_DAMAGE = 1

const FIRE_HINT_TEXT = 'SPACE'
const FIRE_HINT_RISE_PX = 40
const FIRE_HINT_DURATION_MS = 2200

// Session-scoped (module-level, not persisted): resets on a full page reload
// but survives "Play again" re-creating the Phaser.Game, matching
// docs/game-design.md's "Onboarding" decision that this hint shows once per
// session, not once per run.
let hasShownFireHint = false

// Drives Sour Blaster's fire input (docs/game-design.md "Power-ups"): while
// the player's blasterActive flag is set, holding the fire key spawns a
// Projectile at a cooldown-gated rate. "Edge-triggered against the cooldown"
// per the design doc means exactly this — an isDown check gated by elapsed
// time since the last shot, so holding vs. tapping the key doesn't need
// separate handling; the cooldown alone turns holding into a steady rhythm.
export class BlasterSystem {
  private readonly scene: Phaser.Scene
  private readonly player: Player
  private readonly projectiles: Phaser.Physics.Arcade.Group
  private readonly fireKey: Phaser.Input.Keyboard.Key
  private lastFiredAt = -Infinity

  constructor(
    scene: Phaser.Scene,
    player: Player,
    projectiles: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene
    this.player = player
    this.projectiles = projectiles

    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input plugin is not available')
    }
    // addKey's default enableCapture (true) calls preventDefault for SPACE
    // while the canvas has focus, so the browser doesn't scroll the page on
    // every shot (docs/game-design.md "Controls").
    this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    scene.events.on('blasterPickedUp', this.showFireHintOnce, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('blasterPickedUp', this.showFireHintOnce, this)
    })
  }

  update() {
    if (!this.player.blasterActive || !this.fireKey.isDown) {
      return
    }
    const now = this.scene.time.now
    if (now - this.lastFiredAt < FIRE_COOLDOWN_MS) {
      return
    }
    this.lastFiredAt = now
    this.fire()
  }

  private fire() {
    const projectile = new Projectile(
      this.scene,
      this.player.x,
      this.player.y - this.player.displayHeight / 2 - 4,
      PROJECTILE_SPEED,
    )
    this.projectiles.add(projectile)
    // Group.add() re-applies group body defaults (incl. velocityY: 0), so
    // velocity must be reasserted after add — same fix as every other
    // entity's launch() (see docs/build-plan.md Phase 3 notes).
    projectile.setVelocityY(-PROJECTILE_SPEED)
  }

  private showFireHintOnce() {
    if (hasShownFireHint) {
      return
    }
    hasShownFireHint = true

    const hint = this.scene.add
      .text(this.player.x, this.player.y - 46, FIRE_HINT_TEXT, {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#4dd2ff',
      })
      .setOrigin(0.5)
      .setDepth(101)

    this.scene.tweens.add({
      targets: hint,
      y: hint.y - FIRE_HINT_RISE_PX,
      alpha: 0,
      duration: FIRE_HINT_DURATION_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => hint.destroy(),
    })
  }
}
