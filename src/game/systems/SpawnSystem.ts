import Phaser from 'phaser'

import { GAME_WIDTH } from '../config'
import { spawnTable, type SpawnEntry } from '../data/spawnTable'
import { Obstacle } from '../entities/Obstacle'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "spawn ramp rate"). Fixed placeholder interval until Phase 3.2 replaces it
// with the decaying-rate spawnIntervalMs(t) difficulty curve. Uses Phaser's
// Time/Clock API (docs/architecture.md "Engine patterns"), which is
// wall-clock/delta-based, so spawn cadence is frame-rate independent.
const SPAWN_INTERVAL_MS = 900

// Generic weighted spawner: periodically picks a spawn-table row by weight and
// drops it into the obstacle physics group. No branching on specific ids (see
// docs/dev-standards.md "no god-files"). Difficulty-tier gating and the
// decaying spawn-rate curve are Phase 3.2, not here.
export class SpawnSystem {
  private readonly scene: Phaser.Scene
  private readonly group: Phaser.Physics.Arcade.Group
  private readonly entries: SpawnEntry[]
  private readonly totalWeight: number
  private timer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene
    this.group = group
    this.entries = spawnTable.filter((entry) => entry.kind === 'obstacle')
    this.totalWeight = this.entries.reduce(
      (sum, entry) => sum + entry.weight,
      0,
    )
  }

  start() {
    this.timer = this.scene.time.addEvent({
      delay: SPAWN_INTERVAL_MS,
      loop: true,
      callback: this.spawn,
      callbackScope: this,
    })
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.timer?.remove()
    })
  }

  private spawn() {
    const entry = this.pickWeighted()
    const obstacle = new Obstacle(
      this.scene,
      entry,
      Phaser.Math.Between(0, GAME_WIDTH),
    )
    this.group.add(obstacle)
    // Group.add() re-applies group body defaults (incl. velocityY: 0), so
    // velocity must be asserted here, after the add — see Obstacle.launch().
    obstacle.launch()
  }

  // Standard weighted random selection (unseeded Math.random per
  // docs/architecture.md "RNG").
  private pickWeighted(): SpawnEntry {
    let roll = Math.random() * this.totalWeight
    for (const entry of this.entries) {
      roll -= entry.weight
      if (roll < 0) {
        return entry
      }
    }
    return this.entries[this.entries.length - 1]
  }
}
