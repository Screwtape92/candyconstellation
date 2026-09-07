import { useEffect, useRef } from 'react'

import type { BakedSprites } from './useBakedSprites'

// Ambient starfield with the game's own candy drifting through it, sized to
// whatever element it fills. Two canvas draws per frame and no allocation
// after seeding, so it stays cheap enough to sit behind page content.

const FALLERS = [
  'gummy-meteor',
  'jawbreaker',
  'sour-comet',
  'candy-star',
  'hop-nebula-dust',
  'malt-meteorite',
  'candy-magnet',
  'candy-heart',
]

// One drifter per this many px of width, so a wide screen is not sparse and a
// narrow one is not crowded.
const PX_PER_DRIFTER = 150
const MIN_DRIFTERS = 7
const PX_PER_STAR = 4800

type Drifter = {
  key: string
  x: number
  y: number
  fallSpeed: number
  angle: number
  spin: number
  scale: number
}

type Star = {
  x: number
  y: number
  radius: number
  alpha: number
  speed: number
}

export function CandyField({ sprites }: { sprites: BakedSprites | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sprites) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const keys = FALLERS.filter((key) => key in sprites)
    let width = 0
    let height = 0
    let stars: Star[] = []
    let drifters: Drifter[] = []

    const spawn = (y: number): Drifter => ({
      key: keys[Math.floor(Math.random() * keys.length)],
      x: Math.random() * width,
      y,
      fallSpeed: 15 + Math.random() * 26,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.5,
      scale: 0.85 + Math.random() * 0.55,
    })

    const seed = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      stars = Array.from(
        { length: Math.round((width * height) / PX_PER_STAR) },
        () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.4 + Math.random() * 1.4,
          alpha: 0.2 + Math.random() * 0.55,
          speed: 4 + Math.random() * 16,
        }),
      )
      drifters = Array.from(
        { length: Math.max(MIN_DRIFTERS, Math.round(width / PX_PER_DRIFTER)) },
        () => spawn(Math.random() * height),
      )
    }

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let frameId = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#ffffff'
      for (const star of stars) {
        star.y += star.speed * dt
        if (star.y > height + 2) {
          star.y = -2
          star.x = Math.random() * width
        }
        ctx.globalAlpha = star.alpha
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 0.9
      for (const drifter of drifters) {
        const sprite = sprites[drifter.key]
        drifter.y += drifter.fallSpeed * dt
        drifter.angle += drifter.spin * dt
        if (drifter.y > height + sprite.h * 2) {
          Object.assign(drifter, spawn(-sprite.h * 2))
        }
        const w = sprite.w * drifter.scale
        const h = sprite.h * drifter.scale
        ctx.save()
        ctx.translate(drifter.x, drifter.y)
        ctx.rotate(drifter.angle)
        ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
      ctx.globalAlpha = 1

      if (!reduced) {
        frameId = requestAnimationFrame(frame)
      }
    }

    seed()
    frameId = requestAnimationFrame(frame)
    window.addEventListener('resize', seed)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', seed)
    }
  }, [sprites])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 block h-full w-full"
    />
  )
}
