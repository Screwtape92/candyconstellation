import type { Player } from '../entities/Player'

// Generic timed-effect power-up shape (see docs/game-design.md "Power-ups").
// Adding a power-up is adding a row here, never new systems code — PowerUpSystem
// drives every row through this same interface.
export interface PowerUpDef {
  id: string
  /** Display name for the HUD timer / how-to-play legend. */
  label: string
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
// Exported so the site's how-to-play section states the real numbers rather
// than a hand-copied duplicate that silently rots when these are retuned.
export const CANDY_MAGNET_DURATION_MS = 6000
export const CANDY_HEART_RESTORE = 1

// Added 2026-09-07 (docs/game-design.md "Power-ups"). Both are the same
// timed-effect shape as Candy Magnet — see the two entries below — with their
// own independent duration so tuning one never moves the others.
export const SUGAR_SHIELD_DURATION_MS = 5000
export const SOUR_BLASTER_DURATION_MS = 6000

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
    label: 'Candy Magnet',
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
    label: 'Candy Heart',
    durationMs: 0,
    stacking: 'stack',
    onApply: (player) => {
      player.scene.events.emit('heal', CANDY_HEART_RESTORE)
    },
    onExpire: () => {},
  },
  // Sugar Shield (added 2026-09-07) — full invulnerability for the window,
  // reusing HealthSystem's existing invulnerability check rather than a
  // second mechanism (docs/game-design.md "Power-ups"). `shieldChanged` is a
  // scene event, not a direct method call, matching this codebase's
  // systems-talk-via-events convention (see candy-heart's `heal` emit above).
  {
    id: 'sugar-shield',
    label: 'Sugar Shield',
    durationMs: SUGAR_SHIELD_DURATION_MS,
    stacking: 'refresh',
    onApply: (player) => {
      player.shieldActive = true
      player.scene.events.emit('shieldChanged', true)
    },
    onExpire: (player) => {
      player.shieldActive = false
      player.scene.events.emit('shieldChanged', false)
    },
  },
  // Sour Blaster (added 2026-09-07) — the PowerUpDef row itself is trivial
  // (flip a flag BlasterSystem reads), but the mechanic behind the flag
  // (projectiles, obstacle durability) is real systems work — see
  // docs/game-design.md "Power-ups" for why this one isn't "just a data row"
  // the way every other row in this file is. `blasterPickedUp` drives the
  // one-time fire-key hint (docs/game-design.md "Onboarding") — emitted only
  // on apply, not on every frame the flag happens to be true.
  {
    id: 'sour-blaster',
    label: 'Sour Blaster',
    durationMs: SOUR_BLASTER_DURATION_MS,
    stacking: 'refresh',
    onApply: (player) => {
      player.blasterActive = true
      player.scene.events.emit('blasterPickedUp')
    },
    onExpire: (player) => {
      player.blasterActive = false
    },
  },
]
