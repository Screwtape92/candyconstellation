import Phaser from 'phaser'

import { GAME_WIDTH } from '../config'
import { spawnTable, type SpawnEntry } from '../data/spawnTable'
import { Collectible } from '../entities/Collectible'
import { Obstacle } from '../entities/Obstacle'
import {
  difficultyTier,
  obstacleSpeed,
  spawnIntervalMs,
} from './DifficultyCurve'

// A spawned entity: obstacle or collectible today, power-ups added in Phase
// 3.4. All spawn entities share the same add-then-launch lifecycle.
type SpawnEntity = Obstacle | Collectible

// Maps each spawnable kind to the physics group its entities belong in. It's
// partial because not every kind has a group yet (power-ups arrive in Phase
// 3.4); the spawn pool is filtered to only the kinds present here, so a row
// whose kind has no group is never selected.
type SpawnGroups = Partial<
  Record<SpawnEntry['kind'], Phaser.Physics.Arcade.Group>
>

// Generic weighted spawner: periodically picks a spawn-table row by weight
// (gated by the current difficulty tier), builds the matching entity, and drops
// it into that kind's physics group. Obstacles and collectibles compete in one
// shared weighted pool (single SpawnEntry[] table with a `kind` discriminant —
// see docs/game-design.md "Spawn table"), not separate per-kind timers. No
// branching on specific ids (see docs/dev-standards.md "no god-files"); the
// only kind-branch is entity construction, the natural extension point for new
// kinds. Cadence and fall speed follow the decaying-rate difficulty curve (see
// docs/game-design.md "Difficulty curve") sampled against elapsed run time.
export class SpawnSystem {
  private readonly scene: Phaser.Scene
  private readonly groups: SpawnGroups
  private readonly entries: SpawnEntry[]
  private timer?: Phaser.Time.TimerEvent
  private startTime = 0

  constructor(scene: Phaser.Scene, groups: SpawnGroups) {
    this.scene = scene
    this.groups = groups
    // Only rows whose kind has a destination group are spawnable. Adding a new
    // kind (e.g. power-ups in Phase 3.4) is: pass its group here + add a case
    // in createEntity — no change to selection or cadence.
    this.entries = spawnTable.filter(
      (entry) => groups[entry.kind] !== undefined,
    )
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
      const group = this.groups[entry.kind]
      const entity = this.createEntity(
        entry,
        Phaser.Math.Between(0, GAME_WIDTH),
        obstacleSpeed(t),
      )
      // Both are guaranteed present here: pickWeighted only returns rows whose
      // kind has a group (see constructor), and every such kind has a
      // createEntity case. The guard keeps that invariant explicit.
      if (group && entity) {
        group.add(entity)
        // Group.add() re-applies group body defaults (incl. velocityY: 0), so
        // velocity must be asserted here, after the add — see entity launch().
        entity.launch()
      }
    }

    this.scheduleNext(t)
  }

  // The single kind-branch in this system: pick the entity class for a row's
  // kind. New kinds extend here (Phase 3.4 adds a 'powerup' case) — spawn
  // cadence and weighted selection stay untouched. `default` returns undefined
  // for any kind without a case yet, which pickWeighted already excludes from
  // the pool, so it can't actually fire today.
  private createEntity(
    entry: SpawnEntry,
    x: number,
    baseSpeed: number,
  ): SpawnEntity | undefined {
    switch (entry.kind) {
      case 'obstacle':
        return new Obstacle(this.scene, entry, x, baseSpeed)
      case 'collectible':
        return new Collectible(this.scene, entry, x, baseSpeed)
      default:
        return undefined
    }
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
