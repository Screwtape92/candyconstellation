import Phaser from 'phaser'

import { GAME_WIDTH } from '../config'
import { spawnTable, type SpawnEntry } from '../data/spawnTable'
import { Obstacle } from '../entities/Obstacle'
import {
  difficultyTier,
  obstacleSpeed,
  spawnIntervalMs,
} from './DifficultyCurve'

// Generic weighted spawner: periodically picks a spawn-table row by weight
// (gated by the current difficulty tier) and drops it into the obstacle physics
// group. No branching on specific ids (see docs/dev-standards.md "no
// god-files"). Cadence and obstacle speed follow the decaying-rate difficulty
// curve (see docs/game-design.md "Difficulty curve") sampled against elapsed
// run time.
export class SpawnSystem {
  private readonly scene: Phaser.Scene
  private readonly group: Phaser.Physics.Arcade.Group
  private readonly entries: SpawnEntry[]
  private timer?: Phaser.Time.TimerEvent
  private startTime = 0

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene
    this.group = group
    this.entries = spawnTable.filter((entry) => entry.kind === 'obstacle')
  }

  start() {
    // scene.time.now is the Clock's frame time (docs/architecture.md
    // "Timed/duration triggers"), so elapsedSec() is wall-clock/delta-based and
    // frame-rate independent. It resets naturally each run since PlayScene
    // reinitializes SpawnSystem on restart.
    this.startTime = this.scene.time.now

    this.scheduleNext(0)
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.timer?.remove()
    })
  }

  // A single loop:true timer can't tighten its cadence: TimerEvent.delay is
  // readonly (verified in phaser's typings + node_modules/phaser/src Clock,
  // which reads it fresh each frame but exposes no supported way to rewrite a
  // live timer's delay). So each spawn schedules the next as a fresh one-shot,
  // recomputing the interval against the current elapsed time — the documented
  // decaying-rate curve (docs/game-design.md "Difficulty curve"). One
  // allocation per spawn (~1/sec), not per frame, so it's clear of the
  // per-frame allocation budget (docs/architecture.md, a Phase 8 concern).
  private scheduleNext(t: number) {
    this.timer = this.scene.time.delayedCall(
      spawnIntervalMs(t),
      this.spawn,
      undefined,
      this,
    )
  }

  private elapsedSec(): number {
    return (this.scene.time.now - this.startTime) / 1000
  }

  private spawn() {
    const t = this.elapsedSec()

    const entry = this.pickWeighted(difficultyTier(t))
    if (entry) {
      const obstacle = new Obstacle(
        this.scene,
        entry,
        Phaser.Math.Between(0, GAME_WIDTH),
        obstacleSpeed(t),
      )
      this.group.add(obstacle)
      // Group.add() re-applies group body defaults (incl. velocityY: 0), so
      // velocity must be asserted here, after the add — see Obstacle.launch().
      obstacle.launch()
    }

    this.scheduleNext(t)
  }

  // Standard weighted random selection (unseeded Math.random per
  // docs/architecture.md "RNG"), restricted to rows unlocked at the current
  // tier via minTier. Returns undefined only if no row is unlocked yet (can't
  // happen while any MVP row has minTier 0, but keeps the gate self-contained).
  private pickWeighted(currentTier: number): SpawnEntry | undefined {
    const unlocked = this.entries.filter(
      (entry) => entry.minTier <= currentTier,
    )
    if (unlocked.length === 0) {
      return undefined
    }
    const totalWeight = unlocked.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = Math.random() * totalWeight
    for (const entry of unlocked) {
      roll -= entry.weight
      if (roll < 0) {
        return entry
      }
    }
    return unlocked[unlocked.length - 1]
  }
}
