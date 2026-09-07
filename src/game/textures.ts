import Phaser from 'phaser'

import type { SpriteVisual } from './data/sprites'
import { spriteVisuals } from './data/sprites'

// Builds every runtime texture at preload time. Two jobs live here:
//
//  1. Normalising the Kenney source art. The packs are tilesets and sprite
//     sheets, not game-ready assets: sizes range from 70x70 to 220x220, and
//     every frame carries transparent padding. Each entry is alpha-trimmed,
//     contain-fitted (aspect preserved) into its docs/asset-spec.md footprint
//     and optionally recolored, so the rest of the game can keep deriving both
//     the sprite's display size and its physics body from the texture — the
//     same thing it did with the Phase 2-4 placeholder rectangles.
//  2. Drawing the handful of things neither pack contains (star, magnet, comet
//     tail, particle dot, starfield layers).
//
// Everything here runs once per game boot on a canvas the size of the final
// texture, so the cost is a few hundred KB of pixel work, not a per-frame one.

// Alpha below this counts as empty when trimming — Kenney's PNGs have faint
// anti-aliased fringes that would otherwise defeat the trim.
const TRIM_ALPHA_THRESHOLD = 8

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

type Bounds = { x: number; y: number; w: number; h: number }

// Tight bounding box of non-transparent pixels. Falls back to the full image
// for a fully transparent source rather than returning a zero-size box.
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

// Trimmed source art, scaled to fit inside boxWidth x boxHeight without
// distortion and centered, on its own canvas. Kept as a separate layer (rather
// than drawn straight onto the target) because the recolor pass ends with a
// 'destination-in' mask, which would erase anything already on the target —
// sour-comet's tail, for one.
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
    // luminosity, so shading and highlights survive the recolor; it also paints
    // the transparent regions, which the 'destination-in' re-blit masks back
    // out to the original silhouette.
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

// Tapering trail above the comet head, fading out toward the top — the
// "trailing tail baked into the loop frames" of docs/asset-spec.md, drawn
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

/** Load key for an entry's raw pack PNG, kept distinct from the baked key. */
export function sourceTextureKey(key: string) {
  return `${key}__src`
}

export function queueSpriteLoads(scene: Phaser.Scene) {
  for (const visual of spriteVisuals) {
    if (visual.file) {
      scene.load.image(
        sourceTextureKey(visual.key),
        `assets/sprites/${visual.file}`,
      )
    }
  }
}

// Registers a finished canvas as a plain image texture.
//
// It would be a line shorter to bake straight into a Phaser CanvasTexture
// (textures.createCanvas) — but a CanvasTexture-backed sprite renders CLIPPED
// under WebGL in Phaser 4.2.1 at any rotation that is not a multiple of 45
// degrees: part of the quad is simply cut away. Verified side by side
// (scripts/dump-textures.mjs plus an A/B of the same art as CanvasTexture vs
// Texture at 0/15/30/45/60/90 degrees) — the image-backed texture is correct at
// every angle, the canvas-backed one is not. Since every obstacle and
// collectible now idle-spins, that path is unusable here. Round-tripping the
// canvas through a data URL yields an ordinary image-backed Texture, which
// rotates correctly.
//
// Cost: one data-URL encode/decode per sprite at boot (9 sprites, all under
// 64x64), which is why the starfield layers and the particle dot stay as canvas
// textures — neither ever rotates, and re-encoding two 720x960 layers would not
// buy anything.
async function addImageTexture(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement,
) {
  const image = new Image()
  image.src = canvas.toDataURL()
  await image.decode()
  scene.textures.addImage(key, image)
}

/**
 * Texture frame for an entry, which is larger than its art when the entry
 * spins.
 *
 * A sprite whose art runs edge to edge in its frame renders CLIPPED once
 * rotated: whatever the rotation pushes past the frame rectangle is cut off,
 * leaving wedges and crescents instead of a spinning meteor. It is invisible at
 * 0/45/90 degrees on a roughly-symmetric shape, which is exactly why it is easy
 * to miss. Verified with an in-game A/B of the same art edge-to-edge vs.
 * centered in a larger frame at 0/15/30/45/60/90 degrees (scripts/ has the
 * harness) — the padded one is correct at every angle.
 *
 * A square frame the length of the art's diagonal is the smallest one that can
 * hold the art at *any* rotation, so the padding is exact rather than guessed.
 * Non-spinning entries (player, candy-heart, sour-comet) keep a frame the exact
 * size of their art. Physics bodies are sized from the art, never the frame
 * (see spriteArtSize), so this padding never widens a hitbox.
 */
function frameSize(visual: SpriteVisual) {
  if (!visual.spinDegPerSec) {
    return { w: visual.w, h: visual.h }
  }
  const diagonal = Math.ceil(Math.hypot(visual.w, visual.h))
  return { w: diagonal, h: diagonal }
}

async function bakeSprite(scene: Phaser.Scene, visual: SpriteVisual) {
  if (scene.textures.exists(visual.key)) {
    return
  }
  const frame = frameSize(visual)
  const canvas = createCanvas(frame.w, frame.h)
  const ctx = context2d(canvas)

  // Everything below draws in art-box coordinates; the frame's padding is just
  // a translation.
  ctx.translate((frame.w - visual.w) / 2, (frame.h - visual.h) / 2)

  // A tailed sprite reserves the top of its canvas for the trail and fits the
  // art into a square box at the bottom, so the head leads as it falls.
  const headHeight = visual.tail ? visual.w : visual.h
  if (visual.tail) {
    drawCometTail(ctx, visual.w, visual.h - headHeight + visual.w * 0.3)
  }

  if (visual.draw === 'star') {
    drawStar(ctx, visual.w, visual.h)
  } else if (visual.draw === 'magnet') {
    drawMagnet(ctx, visual.w, visual.h)
  } else if (visual.file) {
    const image = scene.textures
      .get(sourceTextureKey(visual.key))
      .getSourceImage() as HTMLImageElement
    ctx.drawImage(
      fittedLayer(
        image,
        image.width,
        image.height,
        visual.w,
        headHeight,
        visual.tint,
      ),
      0,
      visual.h - headHeight,
    )
  }

  await addImageTexture(scene, visual.key, canvas)
}

export async function bakeSpriteTextures(scene: Phaser.Scene) {
  await Promise.all(spriteVisuals.map((visual) => bakeSprite(scene, visual)))
}

/** Small white dot for JuiceSystem's bursts; tinted per-burst at runtime. */
export function generateParticleTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number,
) {
  if (scene.textures.exists(key)) {
    return
  }
  const graphics = scene.make.graphics()
  graphics.fillStyle(0xffffff, 1)
  graphics.fillCircle(radius, radius, radius)
  graphics.generateTexture(key, radius * 2, radius * 2)
  graphics.destroy()
}

type StarfieldOptions = {
  width: number
  height: number
  count: number
  maxRadius: number
  maxAlpha: number
}

/**
 * One parallax starfield layer, tileable top-to-bottom: a star near either
 * horizontal edge is drawn a second time one canvas-height away, so the wrap
 * point has no seam (docs/asset-spec.md "Background"). Kept sparse and
 * low-contrast so gameplay sprites stay readable over it.
 */
export function generateStarfieldTexture(
  scene: Phaser.Scene,
  key: string,
  { width, height, count, maxRadius, maxAlpha }: StarfieldOptions,
) {
  if (scene.textures.exists(key)) {
    return
  }
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) {
    throw new Error(`Could not create canvas texture for "${key}"`)
  }
  const ctx = texture.getContext()
  ctx.clearRect(0, 0, width, height)

  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = Phaser.Math.FloatBetween(0.6, maxRadius)
    const alpha = Phaser.Math.FloatBetween(maxAlpha * 0.35, maxAlpha)

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    for (const drawY of [y, y - height, y + height]) {
      if (drawY + radius < 0 || drawY - radius > height) {
        continue
      }
      ctx.beginPath()
      ctx.arc(x, drawY, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  texture.refresh()
}
