import Phaser from 'phaser'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "survival points per second"). Points earned per second survived — the
// survival term of the scoring formula (docs/game-design.md "Scoring"). Kept
// low so survival is a modest baseline and candy pickups (value in
// spawnTable.ts) are the dominant, risk-driven score lever.
export const SURVIVAL_POINTS_PER_SEC = 2

// Generic score tracker for the formula in docs/game-design.md "Scoring":
// score = survivalPointsPerSec * elapsedSec + Σ(candyValue). The survival term
// is recomputed on demand from elapsed time (cheap, drift-free) rather than
// accumulated per tick; only the candy term is a running tally, fed by the
// `candyCollected` scene event (same emit-an-event pattern as HealthSystem's
// `playerHit`/`heal`, see docs/architecture.md "Engine patterns").
export class ScoreSystem {
  private readonly scene: Phaser.Scene
  private candyTally = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    scene.events.on('candyCollected', this.onCandyCollected, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('candyCollected', this.onCandyCollected, this)
    })
  }

  // Public: read at GameOver so PlayScene can carry elapsedSec across the
  // Phaser->React EventBus alongside the final score (docs/architecture.md
  // "React ⇄ Phaser integration").
  //
  // Uses Phaser's own Clock.startTime rather than a `this.scene.time.now`
  // snapshot taken in a start() method: `now` isn't refreshed from the game's
  // real clock until the scene's next preUpdate, so reading it synchronously
  // inside create() (mid-frame, in response to the scene's own START event)
  // can capture a stale, leftover value — 0 on a scene that's never ticked,
  // whatever a previous run left behind otherwise. That only stayed invisible
  // on a run's very first-ever PlayScene, where a fresh Phaser.Game means both
  // readings happen to already be near zero; it broke every subsequent "Play
  // again" run, which reuses a fresh Phaser.Game but not a fresh page, so the
  // shared game-wide clock is already elevated — a stale ~0 baseline against a
  // correctly-climbing `now` made every restarted run's score (and,
  // identically, SpawnSystem's difficulty ramp) inherit wherever the previous
  // run had gotten to, instead of resetting. `Clock.startTime` is Phaser's own
  // field for exactly this, set the moment the scene genuinely starts, so it
  // never has this race.
  get elapsedSec(): number {
    return (this.scene.time.now - this.scene.time.startTime) / 1000
  }

  get current(): number {
    return Math.floor(
      SURVIVAL_POINTS_PER_SEC * this.elapsedSec + this.candyTally,
    )
  }

  private onCandyCollected(payload: { value: number; x: number; y: number }) {
    this.candyTally += payload.value
  }
}
