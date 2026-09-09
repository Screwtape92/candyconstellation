import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { eventBus, GAME_OVER_EVENT } from '../eventBus'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables
// appendix"). How dark the frozen field goes behind the overlay, and how long
// GAME OVER takes to grow in / sit before handing off to React.
const DIM_ALPHA = 0.6
const GROW_MS = 550
const HOLD_MS = 900

// Camera shake on impact, reusing JuiceSystem's own hit-shake feel
// (docs/game-design.md "Feel & experience") rather than inventing a separate
// intensity for this one moment.
const SHAKE_MS = 200
const SHAKE_INTENSITY = 0.01

// Data passed in by PlayScene on the gameOver transition (scene.launch
// supports a data payload, surfaced as create()'s argument): the final score
// and elapsed run time from ScoreSystem.
interface GameOverData {
  score?: number
  elapsedSec?: number
  runToken?: string | null
}

// Launched (not started) on top of PlayScene, which is paused rather than
// stopped for this transition — see PlayScene's gameOver handler for why.
// That leaves the frozen field of obstacles/candy visible behind the dim
// overlay this scene draws, so GAME OVER lands as a classic-arcade freeze +
// slam rather than a hard cut to a blank scene.
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene')
  }

  create(data: GameOverData) {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      DIM_ALPHA,
    )

    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ff5555',
      })
      .setOrigin(0.5)
      .setScale(0.05)

    this.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY)

    this.tweens.add({
      targets: label,
      scale: 1,
      duration: GROW_MS,
      ease: 'Back.Out',
    })

    // React swaps the whole Phaser.Game out for the post-game name-entry
    // screen the instant this fires (docs/architecture.md "React ⇄ Phaser
    // integration"), so the hold after the grow is the last moment the player
    // sees their run — long enough to read GAME OVER, not so long it stalls
    // the handoff to submitting a score.
    this.time.delayedCall(GROW_MS + HOLD_MS, () => {
      eventBus.emit(GAME_OVER_EVENT, {
        score: data.score ?? 0,
        elapsedSec: data.elapsedSec ?? 0,
        runToken: data.runToken ?? null,
      })
    })
  }
}
