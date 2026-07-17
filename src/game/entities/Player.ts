import Phaser from 'phaser'

export const PLAYER_TEXTURE_KEY = 'player'
export const PLAYER_SIZE = 32

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Placeholder feel: responsive, not floaty. Arcade Physics integrates these
// per-second values against real frame delta, so movement is frame-rate
// independent without hand-rolled delta math.
const ACCELERATION = 2400
const DRAG = 1600
const MAX_SPEED = 420

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
