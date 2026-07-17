import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'

// Placeholder-graphics game-over screen (real assets are Phase 7). Per the
// state machine in docs/game-design.md, PlayScene (health <= 0) transitions
// here. The React post-game screen (name entry/score submission/leaderboard)
// is Phase 6 and doesn't exist yet, so this offers only an instant restart
// back into PlayScene — satisfying the "GameOver → next run near-instant"
// requirement in docs/game-design.md's "Feel & experience" section.
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene')
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff5555',
      })
      .setOrigin(0.5)

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 30,
        'Press any key to play again',
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5)

    // scene.start fully shuts down this scene and re-runs PlayScene.create(),
    // giving a fresh run (health reset, fresh obstacle group) rather than
    // resuming stale state. A restarting flag guards against both the key and
    // pointer handlers firing a double transition.
    let restarting = false
    const restart = () => {
      if (restarting) {
        return
      }
      restarting = true
      this.scene.start('PlayScene')
    }

    this.input.keyboard?.once('keydown', restart)
    this.input.once('pointerdown', restart)
  }
}
