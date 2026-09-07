import Phaser from 'phaser'

import type { SpriteVisual } from './data/sprites'
import { spriteVisuals } from './data/sprites'
import { bakeSpriteCanvas, spriteSourceUrl } from './spriteBaking'

// Phaser glue around src/game/spriteBaking.ts: loads the raw pack PNGs, hands
// them to the Phaser-free baker, and registers the results as textures. Also
// generates the two things only the game needs — the particle dot and the
// parallax starfield layers.

/** Load key for an entry's raw pack PNG, kept distinct from the baked key. */
export function sourceTextureKey(key: string) {
  return `${key}__src`
}

export function queueSpriteLoads(scene: Phaser.Scene) {
  for (const visual of spriteVisuals) {
    if (visual.file) {
      scene.load.image(
        sourceTextureKey(visual.key),
        spriteSourceUrl(visual.file),
      )
    }
  }
}

// Registers a finished canvas as a plain image texture.
//
// It would be a line shorter to bake straight into a Phaser CanvasTexture
// (textures.createCanvas), but round-tripping through a data URL yields an
// ordinary image-backed Texture, which is what the rest of the loaded art is —
// one texture kind behaving one way, rather than two.
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

async function bakeSprite(scene: Phaser.Scene, visual: SpriteVisual) {
  if (scene.textures.exists(visual.key)) {
    return
  }
  const source = visual.file
    ? (scene.textures
        .get(sourceTextureKey(visual.key))
        .getSourceImage() as HTMLImageElement)
    : undefined

  await addImageTexture(scene, visual.key, bakeSpriteCanvas(visual, source))
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
