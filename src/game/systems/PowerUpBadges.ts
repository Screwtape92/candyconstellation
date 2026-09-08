import Phaser from 'phaser'

import type { Player } from '../entities/Player'

// On-ship visual per active timed power-up (added 2026-09-07, playtest
// feedback: "not obvious that you have powerups" — the HUD timer bars alone
// weren't enough). The shield badge uses a real forcefield-ring texture
// (`shield-effect`, already sized to surround the ship — see data/sprites.ts)
// rather than an enlarged copy of the pickup icon, and the magnet badge
// reuses the same horseshoe-with-pole-tips icon HowToPlay shows. Sour
// Blaster has no badge (removed 2026-09-08): the ship itself reskins while
// it's active (powerUps.ts), which already answers "do I have the gun" more
// directly than a floating icon beside it did.
interface BadgeConfig {
  textureKey: string
  scale: number
  baseAlpha: number
  offsetX: number
  offsetY: number
  /** 'alpha' pulses opacity (for a bubble that should stay one size); 'scale'
   * pulses size (reads better for a small icon than an alpha flicker does). */
  pulse: 'alpha' | 'scale'
}

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  'sugar-shield': {
    textureKey: 'shield-effect',
    scale: 1.1,
    baseAlpha: 0.75,
    offsetX: 0,
    offsetY: 0,
    pulse: 'alpha',
  },
  'candy-magnet': {
    textureKey: 'candy-magnet',
    scale: 1.3,
    baseAlpha: 0.95,
    offsetX: -34,
    offsetY: -32,
    pulse: 'scale',
  },
}

const PULSE_PERIOD_MS = 260
const SCALE_PULSE_AMOUNT = 0.12

// Below the HUD (PowerUpHud.HUD_DEPTH = 200) but above every gameplay entity
// (all default to depth 0), so a badge is always visible over an obstacle it
// happens to overlap.
const BADGE_DEPTH = 4

export class PowerUpBadges {
  private readonly scene: Phaser.Scene
  private readonly player: Player
  private readonly badges = new Map<string, Phaser.GameObjects.Image>()

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player
  }

  update(activeIds: string[]) {
    const activeSet = new Set(activeIds)
    for (const [id, image] of this.badges) {
      if (!activeSet.has(id)) {
        image.destroy()
        this.badges.delete(id)
      }
    }

    activeIds.forEach((id) => {
      const config = BADGE_CONFIG[id]
      if (!config) {
        return
      }
      let badge = this.badges.get(id)
      if (!badge) {
        badge = this.scene.add
          .image(0, 0, config.textureKey)
          .setDepth(BADGE_DEPTH)
        this.badges.set(id, badge)
      }
      badge.setPosition(
        this.player.x + config.offsetX,
        this.player.y + config.offsetY,
      )

      const pulse = Math.sin(this.scene.time.now / PULSE_PERIOD_MS)
      if (config.pulse === 'alpha') {
        badge.setScale(config.scale)
        badge.setAlpha(config.baseAlpha * (0.7 + 0.3 * pulse))
      } else {
        badge.setAlpha(config.baseAlpha)
        badge.setScale(config.scale + SCALE_PULSE_AMOUNT * pulse)
      }
    })
  }
}
