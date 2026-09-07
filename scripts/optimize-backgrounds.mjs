// Dev tool: re-encodes the two parallax background layers (2026-09-07,
// docs/game-design.md-adjacent asset work) from their raw ~1.1-1.2MB PNG
// sources down to 720x960 WebP — the exact game canvas size (src/game/config.ts
// GAME_WIDTH/GAME_HEIGHT), so the full composition is visible before the
// TileSprite needs to wrap, same idea as scripts/optimize-images.mjs for the
// site's bottle/label art.
//
//   npm run dev      # in another terminal
//   node scripts/optimize-backgrounds.mjs
import { chromium } from 'playwright'
import fs from 'fs'

const OUT = 'public/assets/backgrounds'
const WIDTH = 720
const HEIGHT = 960
const JOBS = [
  { src: 'space-far-src.png', name: 'space-far' },
  { src: 'space-near-src.png', name: 'space-near' },
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })

for (const job of JOBS) {
  const dataUri = await page.evaluate(
    async ({ src, width, height }) => {
      const img = new Image()
      img.src = `/assets/backgrounds/${src}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/webp', 0.85)
    },
    { src: job.src, width: WIDTH, height: HEIGHT },
  )
  const file = `${job.name}.webp`
  fs.writeFileSync(
    `${OUT}/${file}`,
    Buffer.from(dataUri.split(',')[1], 'base64'),
  )
  console.log(
    file,
    Math.round(fs.statSync(`${OUT}/${file}`).size / 1024) + 'KB',
  )
}

await browser.close()
