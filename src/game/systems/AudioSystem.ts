import Phaser from 'phaser'

// TUNABLE — playtest, not final (see docs/game-design.md "Audio spec").
const SFX_VOLUME = 0.6

// Drives every one-shot SFX cue from one event-driven system (docs/game-
// design.md "Audio spec") — adding a cue is a row in data/audioCues.ts and
// one listener here, never new playback plumbing. Deliberately doesn't own
// the background music (that's site-wide now, see BackgroundMusic.tsx —
// "must always play, game or no game," so it can't live inside a
// PlayScene that gets destroyed every run) or the blaster fire loop (that's
// a continuous held-key state, owned directly by BlasterSystem, not a
// discrete event).
export class AudioSystem {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    scene.events.on('playerDamaged', this.onObstacleHit, this)
    scene.events.on('candyCollected', this.onCandyPickup, this)
    scene.events.on('powerUpApplied', this.onPowerUpActivate, this)
    scene.events.on('obstacleDestroyed', this.onObstacleDestroyed, this)
    scene.events.once('gameOver', this.onGameOver, this)

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('playerDamaged', this.onObstacleHit, this)
      scene.events.off('candyCollected', this.onCandyPickup, this)
      scene.events.off('powerUpApplied', this.onPowerUpActivate, this)
      scene.events.off('obstacleDestroyed', this.onObstacleDestroyed, this)
      scene.events.off('gameOver', this.onGameOver, this)
    })
  }

  private onObstacleHit() {
    this.play('obstacle-hit')
  }

  private onCandyPickup() {
    this.play('candy-pickup')
  }

  private onPowerUpActivate() {
    this.play('powerup-activate')
  }

  private onObstacleDestroyed() {
    this.play('obstacle-destroyed')
  }

  private onGameOver() {
    this.play('game-over')
  }

  private play(key: string) {
    this.scene.sound.play(key, { volume: SFX_VOLUME })
  }
}
