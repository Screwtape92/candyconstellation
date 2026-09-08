import { useEffect, useState, type ReactNode } from 'react'

import { spriteVisual } from './data/sprites'
import type { HudState } from './eventBus'
import { bakeSpriteCanvas, spriteSourceUrl } from './spriteBaking'
import { useHudState } from './useHudState'
import { loadImage } from '../site/useBakedSprites'

// Same hex values as PowerUpSystem.ts's HUD_COLOR map (Phaser needs numbers,
// this needs CSS strings) — keep the two in sync by eye if a power-up's
// accent ever changes; see docs/game-design.md "Active power-up readout".
const POWERUP_COLOR: Record<string, string> = {
  'candy-magnet': '#ff6b6b',
  'sugar-shield': '#ffb3c6',
  'sour-blaster': '#4dd2ff',
}
const DEFAULT_COLOR = '#8be9fd'

const clampFraction = (value: number) => Math.min(1, Math.max(0, value))

// Bakes just the one sprite this panel needs (the Candy Heart power-up icon,
// reused as the health-pip glyph — "hearts, not blocks") rather than the
// full set useBakedSprites bakes for the how-to-play legend. Static art, so
// this only ever runs once per mount.
function useHeartIconUrl() {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const visual = spriteVisual('candy-heart')
    if (!visual) {
      return
    }
    const bake = async () => {
      const source = visual.file
        ? await loadImage(spriteSourceUrl(visual.file))
        : undefined
      const canvas = bakeSpriteCanvas(visual, source)
      if (!cancelled) {
        setUrl(canvas.toDataURL())
      }
    }
    bake().catch((err: unknown) => {
      console.error('Could not bake heart icon', err)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return url
}

function HealthPips({
  health,
  maxHealth,
  heartUrl,
}: {
  health: number
  maxHealth: number
  heartUrl: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-mono text-xs tracking-[0.3em] text-dim">HEALTH</p>
      <div className="flex gap-2">
        {Array.from({ length: maxHealth }).map((_, i) =>
          heartUrl ? (
            <img
              key={i}
              src={heartUrl}
              alt=""
              className={`h-14 w-14 ${i < health ? '' : 'opacity-20 grayscale'}`}
            />
          ) : (
            // Before the bake resolves — same footprint, so nothing shifts
            // once the real icon appears.
            <span key={i} className="h-14 w-14" />
          ),
        )}
      </div>
    </div>
  )
}

function ScoreReadout({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono text-xs tracking-[0.3em] text-dim">SCORE</p>
      <p className="font-display text-4xl font-extrabold text-cream tabular-nums">
        {score}
      </p>
    </div>
  )
}

function PowerUpTimers({ powerUps }: { powerUps: HudState['powerUps'] }) {
  if (powerUps.length === 0) {
    return null
  }
  return (
    <div className="flex w-full flex-col items-center gap-6">
      {powerUps.map((p) => (
        <div key={p.id} className="flex w-full flex-col items-center gap-2">
          <p className="font-display text-base font-extrabold text-cream">
            {p.label}
          </p>
          <div className="h-5 w-full max-w-[220px] border-2 border-rim bg-panel">
            <div
              className="h-full transition-[width] duration-100"
              style={{
                width: `${Math.round(clampFraction(p.remainingFraction) * 100)}%`,
                backgroundColor: POWERUP_COLOR[p.id] ?? DEFAULT_COLOR,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function BlasterFlash() {
  return (
    <p className="hud-flash text-center font-display text-2xl font-extrabold text-sky-candy">
      SPACE
      <br />
      TO SHOOT!
    </p>
  )
}

function StatusPanel({
  hud,
  blasterFlash,
  heartUrl,
}: {
  hud: HudState
  blasterFlash: boolean
  heartUrl: string | null
}) {
  return (
    <div className="flex w-full flex-col items-center gap-10">
      <HealthPips
        health={hud.health}
        maxHealth={hud.maxHealth}
        heartUrl={heartUrl}
      />
      <ScoreReadout score={hud.score} />
      <PowerUpTimers powerUps={hud.powerUps} />
      {blasterFlash && <BlasterFlash />}
    </div>
  )
}

// Wraps the game canvas with two mirrored large-format status panels in the
// open space either side of it — the portrait canvas doesn't fill a wide
// desktop viewport, and playtest feedback wanted health/power-up status to
// be obvious without staring at the small in-canvas HUD. Only shown once
// there's genuinely room (`xl:` breakpoint, ~1280px+); below that this
// renders identically to before (just the canvas, centered), so a smaller
// window is never squeezed to make room.
export function PlaySidePanels({ children }: { children: ReactNode }) {
  const { hud, blasterFlash } = useHudState()
  const heartUrl = useHeartIconUrl()

  return (
    <div className="flex h-full w-full items-center justify-center gap-10">
      <div className="hidden w-64 shrink-0 justify-end xl:flex">
        <StatusPanel
          hud={hud}
          blasterFlash={blasterFlash}
          heartUrl={heartUrl}
        />
      </div>
      <div className="h-full aspect-[3/4]">{children}</div>
      <div className="hidden w-64 shrink-0 xl:flex">
        <StatusPanel
          hud={hud}
          blasterFlash={blasterFlash}
          heartUrl={heartUrl}
        />
      </div>
    </div>
  )
}
