import Phaser from 'phaser'

import { powerUps } from '../data/powerUps'

// Layout — below the health/score readout (health at y=16, score at y=44,
// both ~24px tall, see PlayScene.create()).
const HUD_START_Y = 78
const ROW_SPACING = 20
const BAR_X = 16
const BAR_WIDTH = 130
const BAR_HEIGHT = 8
const LABEL_X = BAR_X + BAR_WIDTH + 10

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

const labelFor = (id: string) =>
  powerUps.find((def) => def.id === id)?.label ?? id

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

  update(active: Array<{ id: string; remainingFraction: number }>) {
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
        row = this.createRow(entry.id)
        this.rows.set(entry.id, row)
      }
      this.reposition(row, index)
      this.applyProgress(row, entry.remainingFraction)
    })
  }

  private createRow(id: string): HudRow {
    const color = HUD_COLOR[id] ?? DEFAULT_COLOR
    const label = this.scene.add
      .text(0, 0, labelFor(id), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setDepth(100)
    const bg = this.scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.45)
      .setOrigin(0, 0.5)
      .setDepth(100)
    const fill = this.scene.add
      .rectangle(0, 0, BAR_WIDTH, BAR_HEIGHT, color, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(101)
    return { bg, fill, label }
  }

  private reposition(row: HudRow, index: number) {
    const y = HUD_START_Y + index * ROW_SPACING
    row.bg.setPosition(BAR_X, y)
    row.fill.setPosition(BAR_X, y)
    row.label.setPosition(LABEL_X, y - row.label.height / 2)
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
