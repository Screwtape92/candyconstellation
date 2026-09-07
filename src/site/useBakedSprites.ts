import { useEffect, useState } from 'react'

import { spriteVisuals, type SpriteVisual } from '../game/data/sprites'
import { bakeSpriteCanvas, spriteSourceUrl } from '../game/spriteBaking'

export interface BakedSprite {
  visual: SpriteVisual
  /** For drawing into a canvas. */
  canvas: HTMLCanvasElement
  /** For an <img> src. */
  url: string
  w: number
  h: number
}

export type BakedSprites = Record<string, BakedSprite>

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error(`Could not load sprite source "${src}"`))
    }
    image.src = src
  })
}

/**
 * The game's own sprite art, baked for use in the DOM.
 *
 * The page shows the real thing — the same source PNGs through the same
 * trim/fit/recolor as the game — rather than a second set of hand-exported
 * images that would drift the moment a sprite changed.
 *
 * Null until every sprite is ready, so callers render one complete set or
 * nothing, never a half-populated legend.
 */
export function useBakedSprites() {
  const [sprites, setSprites] = useState<BakedSprites | null>(null)

  useEffect(() => {
    let cancelled = false

    const bakeAll = async () => {
      const baked = await Promise.all(
        spriteVisuals.map(async (visual) => {
          const source = visual.file
            ? await loadImage(spriteSourceUrl(visual.file))
            : undefined
          const canvas = bakeSpriteCanvas(visual, source)
          return [
            visual.key,
            {
              visual,
              canvas,
              url: canvas.toDataURL(),
              w: canvas.width,
              h: canvas.height,
            },
          ] as const
        }),
      )
      if (!cancelled) {
        setSprites(Object.fromEntries(baked))
      }
    }

    bakeAll().catch((err: unknown) => {
      // The page is still readable without them — the legend and the drifting
      // field just stay empty rather than the whole landing screen failing.
      console.error('Could not bake site sprites', err)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return sprites
}
