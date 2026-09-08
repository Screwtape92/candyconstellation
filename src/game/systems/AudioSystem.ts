import Phaser from 'phaser'

import { MUSIC_KEY } from '../data/audioCues'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables
// appendix"). Music sits well under SFX so a hit/pickup cue always reads
// over the background loop rather than fighting it.
const MUSIC_VOLUME = 0.35
const SFX_VOLUME = 0.6

const MUTE_STORAGE_KEY = 'candyConstellation.audioMuted'

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeMutedPreference(muted: boolean) {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
  } catch {
    // Private browsing / storage disabled — mute still works for this
    // session, it just won't persist across reloads.
  }
}

// Drives every SFX cue plus the background music loop from one event-driven
// system (docs/game-design.md "Audio spec") — adding a cue is a row in
// data/audioCues.ts and one listener here, never new playback plumbing.
// Mute preference persisted to localStorage per the spec, read on
// construction so a fresh "Play again" run (a fresh Phaser.Game, per
// docs/architecture.md) starts in the same mute state the player left.
export class AudioSystem {
  private readonly scene: Phaser.Scene
  private readonly music: Phaser.Sound.BaseSound
  private readonly muteButton: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.sound.setMute(readMutedPreference())

    this.music = scene.sound.add(MUSIC_KEY, {
      loop: true,
      volume: MUSIC_VOLUME,
    })
    this.music.play()

    scene.events.on('playerDamaged', this.onObstacleHit, this)
    scene.events.on('candyCollected', this.onCandyPickup, this)
    scene.events.on('powerUpApplied', this.onPowerUpActivate, this)
    scene.events.on('obstacleDestroyed', this.onObstacleDestroyed, this)
    scene.events.on('blasterFired', this.onBlasterFired, this)
    scene.events.once('gameOver', this.onGameOver, this)

    // Bottom-right: the one corner none of the other HUD pieces use (health/
    // score top-left, power-up timers top-right, on-ship badges near the
    // ship) — see docs/game-design.md "Visual readability".
    this.muteButton = scene.add
      .text(scene.scale.width - 16, scene.scale.height - 16, this.muteLabel(), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(1, 1)
      .setDepth(200)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.toggleMute, this)

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('playerDamaged', this.onObstacleHit, this)
      scene.events.off('candyCollected', this.onCandyPickup, this)
      scene.events.off('powerUpApplied', this.onPowerUpActivate, this)
      scene.events.off('obstacleDestroyed', this.onObstacleDestroyed, this)
      scene.events.off('blasterFired', this.onBlasterFired, this)
      scene.events.off('gameOver', this.onGameOver, this)
      this.music.stop()
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

  private onBlasterFired() {
    this.play('blaster-fire')
  }

  // Music stops at the same moment the game ends — looping over the frozen
  // GAME OVER freeze-frame (docs/game-design.md "Feel & experience") would
  // undercut it.
  private onGameOver() {
    this.music.stop()
    this.play('game-over')
  }

  private toggleMute() {
    const muted = !this.scene.sound.mute
    this.scene.sound.setMute(muted)
    writeMutedPreference(muted)
    this.play('ui-click')
    this.muteButton.setText(this.muteLabel())
  }

  private muteLabel() {
    return this.scene.sound.mute ? 'SOUND: OFF' : 'SOUND: ON'
  }

  private play(key: string) {
    this.scene.sound.play(key, { volume: SFX_VOLUME })
  }
}
