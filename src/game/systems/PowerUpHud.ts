import Phaser from 'phaser'

// Layout — top-right corner (2026-09-07: moved off the top-left, which
// stacked directly under Health/Score and sat in a stretch of screen the
// player's fully-free-roaming ship can fly through, reading as the bars
// disappearing under the ship). Depth is set well above every gameplay
// entity and on-ship badge (see PowerUpBadges) so this never renders behind
// the ship regardless of position.
//
// BAR_X/LABEL_X are read from the scene's own scale.width at runtime
// (reposition() below) rather than importing GAME_WIDTH from ../config: that
// module also imports every scene, one of which imports this file, and a
// module-level `const BAR_X = GAME_WIDTH - ...` evaluated while that import
// cycle is still resolving reads GAME_WIDTH before config.ts has assigned it
// ("Cannot access 'GAME_WIDTH' before initialization") — reading it lazily
// inside a method sidesteps the cycle entirely, since every module has
// finished initializing by the time gameplay actually calls update().
const HUD_START_Y = 20
const ROW_SPACING = 20
const BAR_WIDTH = 110
const BAR_HEIGHT = 8
const HUD_DEPTH = 200

// Below this remaining fraction, the bar flashes rather than just shrinking,
// so the last moments before expiry are distinguishable from the middle of
// the window (docs/game-design.md "Active power-up readout").
const LOW_TIME_THRESHOLD = 0.25
const FLASH_PERIOD_MS = 180

// Per-id accent so multiple simultaneously-active power-ups stay unambiguous
// (docs/game-design.md "Active power-up readout") — matches each power-up's
// own glow tint in data/sprites.ts where one exists.
const HUD_COLOR: Record<string, number> = {
  'candy-magnet': 0xff6b6b,
  'sugar-shield': 0xffb3c6,
  'sour-blaster': 0x4dd2ff,
}
const DEFAULT_COLOR = 0x8be9fd

interface HudRow {
  bg: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

// Generic HUD readout for every currently-active timed power-up (docs/game-
// design.md "Active power-up readout") — polled from PlayScene.update() with
// PowerUpSystem.activeTimers(), so a new timed power-up added to
// data/powerUps.ts gets a bar for free with no HUD change. One row per
// active id; rows above an expired one shift up to fill the gap, since
// position is always derived from the current active list's order.
export class PowerUpHud {
  private readonly scene: Phaser.Scene
  private readonly rows = new Map<string, HudRow>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  update(
    active: Array<{ id: string; label: string; remainingFraction: number }>,
  ) {
    const activeIds = new Set(active.map((entry) => entry.id))
    for (const [id, row] of this.rows) {
      if (!activeIds.has(id)) {
        row.bg.destroy()
        row.fill.destroy()
        row.label.destroy()
        this.rows.delete(id)
      }
    }

    active.forEach((entry, index) => {
      let row = this.rows.get(entry.id)
      if (!row) {
        row = this.createRow(entry.id, entry.label)
        this.rows.set(entry.id, row)
      }
      this.reposition(row, index)
      this.applyProgress(row, entry.remainingFraction)
    })
  }

  private createRow(id: string, label: string): HudRow {
    const color = HUD_COLOR[id] ?? DEFAULT_COLOR
    const labelText = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5)
      .setDepth(HUD_DEPTH)
    const bg = this.scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.45)
      .setOrigin(0, 0.5)
      .setDepth(HUD_DEPTH)
    const fill = this.scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, color, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(HUD_DEPTH + 1)
    return { bg, fill, label: labelText }
  }

  private reposition(row: HudRow, index: number) {
    const barX = this.scene.scale.width - 16 - BAR_WIDTH
    const y = HUD_START_Y + index * ROW_SPACING
    row.bg.setPosition(barX, y)
    row.fill.setPosition(barX, y)
    row.label.setPosition(barX - 10, y)
  }

  private applyProgress(row: HudRow, remainingFraction: number) {
    const clamped = Phaser.Math.Clamp(remainingFraction, 0, 1)
    row.fill.setSize(Math.max(1, BAR_WIDTH * clamped), BAR_HEIGHT)
    row.fill.setAlpha(
      clamped < LOW_TIME_THRESHOLD
        ? 0.5 + 0.5 * Math.sin(this.scene.time.now / FLASH_PERIOD_MS)
        : 0.9,
    )
  }
}
