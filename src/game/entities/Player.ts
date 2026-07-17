import Phaser from 'phaser'

export const PLAYER_TEXTURE_KEY = 'player'
export const PLAYER_SIZE = 32

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Arcade Physics integrates these per-second values against real frame delta,
// so movement is frame-rate independent without hand-rolled delta math.
//
// Revised after the first Phase 4.3 playtest round (testers reported movement
// felt sluggish). The old values (accel 2400 / drag 1600 / max 420) dated to
// Phase 2.1's 960x540 landscape canvas and were never revisited for the
// current 720x960 portrait canvas. Sluggishness in an accel-based model comes
// from a perceptible ramp-up/ramp-down: accel is raised so max speed is reached
// in ~0.1s (600/6000) for near-instant direction changes, and drag is raised to
// match accel so stopping/reversing is just as crisp rather than floaty. Max
// speed is up too so the narrower 720px-wide play space still crosses quickly
// (~1.2s full width) without being twitchy for the non-gamer onboarding audience.
const ACCELERATION = 6000
const DRAG = 6000
const MAX_SPEED = 600

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  w: Phaser.Input.Keyboard.Key
  a: Phaser.Input.Keyboard.Key
  s: Phaser.Input.Keyboard.Key
  d: Phaser.Input.Keyboard.Key
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Set true while a Candy Magnet power-up is active; read each frame by
  // PowerUpSystem's collectible pull (see docs/game-design.md "Power-ups").
  // A flag rather than a system reference so the effect stays data-driven.
  magnetActive = false

  private readonly keys: MovementKeys

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURE_KEY)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setDrag(DRAG, DRAG)
    this.setMaxVelocity(MAX_SPEED, MAX_SPEED)

    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input plugin is not available')
    }
    const codes = Phaser.Input.Keyboard.KeyCodes
    this.keys = keyboard.addKeys({
      up: codes.UP,
      down: codes.DOWN,
      left: codes.LEFT,
      right: codes.RIGHT,
      w: codes.W,
      a: codes.A,
      s: codes.S,
      d: codes.D,
    }) as MovementKeys
  }

  update() {
    const left = this.keys.left.isDown || this.keys.a.isDown
    const right = this.keys.right.isDown || this.keys.d.isDown
    const up = this.keys.up.isDown || this.keys.w.isDown
    const down = this.keys.down.isDown || this.keys.s.isDown

    const ax = (right ? 1 : 0) - (left ? 1 : 0)
    const ay = (down ? 1 : 0) - (up ? 1 : 0)

    this.setAcceleration(ax * ACCELERATION, ay * ACCELERATION)
  }
}
