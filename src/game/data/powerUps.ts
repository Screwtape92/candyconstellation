import type { Player } from '../entities/Player'

// Generic timed-effect power-up shape (see docs/game-design.md "Power-ups").
// Adding a power-up is adding a row here, never new systems code — PowerUpSystem
// drives every row through this same interface.
export interface PowerUpDef {
  id: string
  durationMs: number
  stacking: 'refresh' | 'ignore' | 'stack'
  onApply: (player: Player) => void
  onExpire: (player: Player) => void
}

// TUNABLE — playtest, not final (see docs/game-design.md "Tunables appendix").
// Candy Magnet's active window ("power-up duration") and Candy Heart's restore
// amount are placeholder balance values. Magnet duration is a short bonus
// window; heart restores one health unit (MAX_HEALTH is 3), a meaningful but
// not full heal.
const CANDY_MAGNET_DURATION_MS = 6000
const CANDY_HEART_RESTORE = 1

// The two MVP power-up rows (names approved 2026-07-15 — see docs/game-design.md
// "MVP content"). They cover the two distinct effect shapes the generic
// interface must support:
//  - candy-magnet: a continuous timed effect. onApply flips a flag on the
//    player; PowerUpSystem's per-frame pull reads that flag and moves in-range
//    collectibles toward the player. onExpire clears the flag.
//  - candy-heart: an instant, one-time effect (durationMs 0, so PowerUpSystem
//    never schedules an expiry). onApply asks HealthSystem to heal by emitting
//    a `heal` event — systems talk via events, not direct method calls
//    (docs/architecture.md "Engine patterns"). onExpire is a no-op. stacking
//    is 'stack' because re-triggering onApply on every pickup is exactly the
//    desired "restore more health" behavior, with no timer bookkeeping.
export const powerUps: PowerUpDef[] = [
  {
    id: 'candy-magnet',
    durationMs: CANDY_MAGNET_DURATION_MS,
    stacking: 'refresh',
    onApply: (player) => {
      player.magnetActive = true
    },
    onExpire: (player) => {
      player.magnetActive = false
    },
  },
  {
    id: 'candy-heart',
    durationMs: 0,
    stacking: 'stack',
    onApply: (player) => {
      player.scene.events.emit('heal', CANDY_HEART_RESTORE)
    },
    onExpire: () => {},
  },
]
