import Phaser from 'phaser'

import { GAME_HEIGHT, GAME_WIDTH } from '../config'
import { eventBus, GAME_OVER_EVENT } from '../eventBus'

// Per the state machine in docs/game-design.md, PlayScene (health <= 0)
// transitions here, and GameOverScene exits to React's post-game screen (name
// entry / score submission / leaderboard). It does so via the EventBus
// (docs/architecture.md "React ⇄ Phaser integration"): emit { score, elapsedSec }
// exactly once, and React swaps the Phaser game out for the post-game screen.
// This supersedes the Phase 2/3 interim behavior (restart-on-keypress straight
// back into PlayScene), which existed only because the React shell didn't yet.
//
// Data passed in by PlayScene on the gameOver transition (scene.start supports a
// data payload, surfaced as create()'s argument): the final score and elapsed
// run time from ScoreSystem.
interface GameOverData {
  score?: number
  elapsedSec?: number
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene')
  }

  create(data: GameOverData) {
    // A brief GAME OVER readout in case there's a frame before React swaps in
    // the post-game screen. React handles the game-over state update after this
    // synchronous emit returns (setState is batched), so the emit can't
    // re-enter Phaser's teardown mid-create.
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ff5555',
      })
      .setOrigin(0.5)

    eventBus.emit(GAME_OVER_EVENT, {
      score: data.score ?? 0,
      elapsedSec: data.elapsedSec ?? 0,
    })
  }
}
