import Phaser from 'phaser'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "survival points per second"). Points earned per second survived — the
// survival term of the scoring formula (docs/game-design.md "Scoring").
const SURVIVAL_POINTS_PER_SEC = 10

// Generic score tracker for the formula in docs/game-design.md "Scoring":
// score = survivalPointsPerSec * elapsedSec + Σ(candyValue). The survival term
// is recomputed on demand from elapsed time (cheap, drift-free) rather than
// accumulated per tick; only the candy term is a running tally, fed by the
// `candyCollected` scene event (same emit-an-event pattern as HealthSystem's
// `playerHit`/`heal`, see docs/architecture.md "Engine patterns").
export class ScoreSystem {
  private readonly scene: Phaser.Scene
  private candyTally = 0
  // scene.time.now is the Clock's frame time (docs/architecture.md
  // "Timed/duration triggers"), so elapsedSec() is delta-based and frame-rate
  // independent. A second independent clock from SpawnSystem's is fine — both
  // start within the same frame of PlayScene.create(), so any skew is
  // irrelevant.
  private startTime = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.events.on('candyCollected', this.onCandyCollected, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('candyCollected', this.onCandyCollected, this)
    })
  }

  start() {
    this.startTime = this.scene.time.now
  }

  private elapsedSec(): number {
    return (this.scene.time.now - this.startTime) / 1000
  }

  get current(): number {
    return Math.floor(
      SURVIVAL_POINTS_PER_SEC * this.elapsedSec() + this.candyTally,
    )
  }

  private onCandyCollected(value: number) {
    this.candyTally += value
  }
}
