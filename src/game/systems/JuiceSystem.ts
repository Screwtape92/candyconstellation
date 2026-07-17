import Phaser from 'phaser'

// Small white dot used for every particle burst; tinted per-burst (hit vs
// pickup) so one emitter/texture serves both. Generated in PreloadScene.
export const PARTICLE_TEXTURE_KEY = 'particle'

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "hit-stop duration"). Brief freeze-frame on an accepted hit; short enough to
// punctuate the impact without stalling the auto-scroll.
const HIT_STOP_MS = 80

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "screen shake intensity"). Intensity is a fraction of the viewport (Phaser
// default is 0.05, which is jarring for a dodger); kept subtle here.
const SHAKE_DURATION_MS = 200
const SHAKE_INTENSITY = 0.01

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix",
// "particle burst"). Particles per burst, and a hard cap on concurrent alive
// particles across all bursts. The emitter's own alive-cap makes explode()
// emit fewer (or none) rather than exceeding the cap — the graceful
// degradation the performance budget in docs/architecture.md requires, with no
// manual pool growth.
const BURST_PARTICLE_COUNT = 12
const MAX_ALIVE_PARTICLES = 60

// Distinct burst colors so a hit reads differently from a pickup at a glance
// (the visual-readability constraint in docs/game-design.md "Feel &
// experience"). Hit reuses the obstacle flash red; pickups get a warm sparkle.
const HIT_BURST_TINT = 0xff5555
const PICKUP_BURST_TINT = 0xfff2a8

type BurstAt = { x: number; y: number }

// Owns all "juice" feedback (see docs/game-design.md "Feel & experience"):
// hit-stop, screen shake, and particle bursts. Event-driven like every other
// system (docs/architecture.md "Engine patterns") — it never reaches into
// other systems. `playerDamaged` (emitted by HealthSystem only when damage is
// actually applied, not on every overlap frame) drives hit-stop + shake + a
// red burst; `pickupBurst` drives a candy-colored burst only.
export class JuiceSystem {
  private readonly scene: Phaser.Scene
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter
  private frozen = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.emitter = scene.add.particles(0, 0, PARTICLE_TEXTURE_KEY, {
      speed: { min: 120, max: 260 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      // Don't stream on creation — every burst is a one-shot explode().
      emitting: false,
      maxAliveParticles: MAX_ALIVE_PARTICLES,
    })
    // Above dynamically-spawned gameplay sprites (depth 0) so bursts aren't
    // hidden behind them.
    this.emitter.setDepth(100)

    scene.events.on('playerDamaged', this.onPlayerDamaged, this)
    scene.events.on('pickupBurst', this.onPickupBurst, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off('playerDamaged', this.onPlayerDamaged, this)
      scene.events.off('pickupBurst', this.onPickupBurst, this)
    })
  }

  private onPlayerDamaged(at: BurstAt) {
    this.hitStop()
    this.scene.cameras.main.shake(SHAKE_DURATION_MS, SHAKE_INTENSITY)
    this.burst(at, HIT_BURST_TINT)
  }

  private onPickupBurst(at: BurstAt) {
    this.burst(at, PICKUP_BURST_TINT)
  }

  private burst(at: BurstAt, tint: number) {
    this.emitter.setParticleTint(tint)
    this.emitter.explode(BURST_PARTICLE_COUNT, at.x, at.y)
  }

  // Pauses the physics simulation for a beat, then resumes. The Time clock,
  // camera effects, and tweens keep running while physics is paused, so the
  // shake still plays during the freeze. Guarded against re-entry: hit-stop and
  // the invuln window are independently TUNABLE, so if hit-stop is ever tuned
  // longer than invuln a second accepted hit mustn't schedule an overlapping
  // resume that unpauses early.
  private hitStop() {
    if (this.frozen) {
      return
    }
    this.frozen = true
    this.scene.physics.world.pause()
    this.scene.time.delayedCall(HIT_STOP_MS, () => {
      this.scene.physics.world.resume()
      this.frozen = false
    })
  }
}
