import type { SpriteVisual } from './data/sprites'

// Turns a raw Kenney pack PNG into a game-ready sprite canvas: alpha-trim,
// aspect-preserving contain-fit into the docs/asset-spec.md footprint, optional
// recolor, plus the procedural pieces neither pack contains.
//
// Deliberately Phaser-free. Two callers need the same art from the same source
// files: PreloadScene bakes it into textures for the game (src/game/textures.ts),
// and the landing page draws it into a plain DOM canvas — and the landing page
// must not boot a Phaser.Game just to find out what a Gummy Meteor looks like.

// Alpha below this counts as empty when trimming — Kenney's PNGs have faint
// anti-aliased fringes that would otherwise defeat the trim.
const TRIM_ALPHA_THRESHOLD = 8

export function spriteSourceUrl(file: string) {
  return `/assets/sprites/${file}`
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function context2d(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('2D canvas context unavailable')
  }
  return ctx
}

function cssColor(hex: number) {
  return `#${hex.toString(16).padStart(6, '0')}`
}

function rgba(hex: number, alpha: number) {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

type Bounds = { x: number; y: number; w: number; h: number }

// Falls back to the full image for a fully transparent source rather than
// returning a zero-size box.
function alphaBounds(
  image: CanvasImageSource,
  width: number,
  height: number,
): Bounds {
  const ctx = context2d(createCanvas(width, height))
  ctx.drawImage(image, 0, 0)
  const { data } = ctx.getImageData(0, 0, width, height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= TRIM_ALPHA_THRESHOLD) {
        continue
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) {
    return { x: 0, y: 0, w: width, h: height }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

// Kept as its own layer rather than drawn straight onto the target, because the
// recolor ends with a 'destination-in' mask that would erase anything already
// there — sour-comet's tail, for one.
function fittedLayer(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number,
  tint?: number,
) {
  const trim = alphaBounds(image, sourceWidth, sourceHeight)
  const scale = Math.min(boxWidth / trim.w, boxHeight / trim.h)
  const drawWidth = trim.w * scale
  const drawHeight = trim.h * scale
  const offsetX = (boxWidth - drawWidth) / 2
  const offsetY = (boxHeight - drawHeight) / 2

  const canvas = createCanvas(boxWidth, boxHeight)
  const ctx = context2d(canvas)
  const blit = () => {
    ctx.drawImage(
      image,
      trim.x,
      trim.y,
      trim.w,
      trim.h,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    )
  }

  blit()
  if (tint !== undefined) {
    // 'color' takes hue+saturation from the fill and keeps the art's own
    // luminosity, so shading survives the recolor; it also paints the
    // transparent regions, which the 'destination-in' re-blit masks back out.
    ctx.globalCompositeOperation = 'color'
    ctx.fillStyle = cssColor(tint)
    ctx.fillRect(0, 0, boxWidth, boxHeight)
    ctx.globalCompositeOperation = 'destination-in'
    blit()
    ctx.globalCompositeOperation = 'source-over'
  }
  return canvas
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const centerX = width / 2
  const centerY = height / 2
  const outer = Math.min(width, height) / 2 - 1
  const inner = outer * 0.45
  const points = 5

  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
  ctx.fillStyle = '#ffd54a'
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#c98a12'
  ctx.stroke()
}

// Horseshoe magnet, opening downward: red band, grey pole tips — the shape
// reads as "magnet" instantly at 32px, which is the whole point of the pickup.
function drawMagnet(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const band = width * 0.22
  const radius = width * 0.28
  const centerX = width / 2
  const centerY = height * 0.44
  const legBottom = height - band / 2 - 1
  const tipLength = height * 0.16

  ctx.lineWidth = band
  ctx.lineCap = 'butt'

  ctx.strokeStyle = '#e0323c'
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, Math.PI, 0)
  ctx.stroke()
  for (const x of [centerX - radius, centerX + radius]) {
    ctx.beginPath()
    ctx.moveTo(x, centerY)
    ctx.lineTo(x, legBottom)
    ctx.stroke()
  }

  ctx.strokeStyle = '#cfd8dc'
  for (const x of [centerX - radius, centerX + radius]) {
    ctx.beginPath()
    ctx.moveTo(x, legBottom - tipLength)
    ctx.lineTo(x, legBottom)
    ctx.stroke()
  }
}

// The "trailing tail baked into the loop frames" of docs/asset-spec.md, drawn
// rather than authored.
function drawCometTail(
  ctx: CanvasRenderingContext2D,
  width: number,
  tailBottom: number,
) {
  const centerX = width / 2
  const gradient = ctx.createLinearGradient(0, 0, 0, tailBottom)
  gradient.addColorStop(0, 'rgba(180, 255, 150, 0)')
  gradient.addColorStop(0.55, 'rgba(200, 255, 170, 0.35)')
  gradient.addColorStop(1, 'rgba(235, 255, 210, 0.85)')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX + width * 0.34, tailBottom)
  ctx.lineTo(centerX - width * 0.34, tailBottom)
  ctx.closePath()
  ctx.fill()
}

// How far a glow blooms beyond the art's own half-width/height. All glowing
// entries are square (w === h), so this is expressed as a multiple of that
// rather than of the diagonal — simpler, and already comfortably bigger than
// the diagonal-based rotation-safety margin below for every current entry.
const GLOW_RADIUS_FACTOR = 1.6

function glowRadius(visual: SpriteVisual) {
  return (Math.max(visual.w, visual.h) / 2) * GLOW_RADIUS_FACTOR
}

// Soft radial-gradient halo, baked behind the art rather than applied as a
// runtime FX: this Phaser version has no per-GameObject glow (the FX pipeline
// from Phaser 3.60 was replaced by camera-level Filters in Phaser 4, which
// apply to everything a camera renders, not one sprite) — see
// docs/asset-spec.md "Pickup glow" for that dead end. Three gradient stops
// taper the glow out gradually rather than in one linear fade, which reads as
// softer light rather than a hard-edged coloured disc.
function drawGlow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  color: number,
) {
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    radius,
  )
  gradient.addColorStop(0, rgba(color, 0.55))
  gradient.addColorStop(0.55, rgba(color, 0.25))
  gradient.addColorStop(1, rgba(color, 0))

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Texture frame for an entry, larger than its art when the entry spins or
 * glows.
 *
 * A sprite whose art runs edge to edge in its frame renders CLIPPED once
 * rotated: whatever the rotation pushes past the frame rectangle is cut away,
 * leaving wedges and crescents instead of a spinning meteor. It is invisible at
 * 0/45/90 degrees on a roughly-symmetric shape, which is exactly why it is easy
 * to miss — a build, a typecheck and a lint all passed over it here.
 *
 * A square frame the length of the art's diagonal is the smallest one that can
 * hold the art at *any* rotation, so the padding is exact rather than guessed.
 * A glow needs its own, usually larger, margin to keep its soft edge from
 * being cut off — see glowRadius() above. Physics bodies are sized from
 * spriteArtSize(), never from the frame, so neither ever widens a hitbox.
 */
export function frameSize(visual: SpriteVisual) {
  if (!visual.spinDegPerSec && !visual.glow) {
    return { w: visual.w, h: visual.h }
  }
  let halfSize = visual.spinDegPerSec
    ? Math.hypot(visual.w, visual.h) / 2
    : Math.max(visual.w, visual.h) / 2
  if (visual.glow) {
    halfSize = Math.max(halfSize, glowRadius(visual))
  }
  const side = Math.ceil(halfSize * 2)
  return { w: side, h: side }
}

/**
 * The finished sprite on its own canvas. `source` is the loaded pack PNG, and
 * is only required for entries that declare a `file`.
 */
export function bakeSpriteCanvas(
  visual: SpriteVisual,
  source?: HTMLImageElement,
) {
  const frame = frameSize(visual)
  const canvas = createCanvas(frame.w, frame.h)
  const ctx = context2d(canvas)

  // Everything below draws in art-box coordinates; the frame's padding is just
  // a translation.
  ctx.translate((frame.w - visual.w) / 2, (frame.h - visual.h) / 2)

  // Glow first, so the art draws on top of it rather than the halo covering
  // the art's own edges.
  if (visual.glow) {
    drawGlow(ctx, visual.w / 2, visual.h / 2, glowRadius(visual), visual.glow)
  }

  // A tailed sprite reserves the top of its art box for the trail and fits the
  // art into a square at the bottom, so the head leads as it falls.
  const headHeight = visual.tail ? visual.w : visual.h
  if (visual.tail) {
    drawCometTail(ctx, visual.w, visual.h - headHeight + visual.w * 0.3)
  }

  if (visual.draw === 'star') {
    drawStar(ctx, visual.w, visual.h)
  } else if (visual.draw === 'magnet') {
    drawMagnet(ctx, visual.w, visual.h)
  } else if (visual.file) {
    if (!source) {
      throw new Error(`Sprite "${visual.key}" needs its source image to bake`)
    }
    ctx.drawImage(
      fittedLayer(
        source,
        source.width,
        source.height,
        visual.w,
        headHeight,
        visual.tint,
      ),
      0,
      visual.h - headHeight,
    )
  }

  return canvas
}
