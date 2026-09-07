// Dev tool: downscales and re-encodes the beer-label artwork to WebP at the
// sizes the site actually uses. The source PNGs are 1254x1254 and ~2.5MB each,
// which is roughly 20x more bytes than any of these placements needs.
//
//   npm run dev      # in another terminal
//   node scripts/optimize-images.mjs
import { chromium } from 'playwright'
import fs from 'fs'

const OUT = 'public/assets/site'
const JOBS = [
  { src: 'ad_image.png', name: 'bottle', widths: [960, 480] },
  { src: 'label.png', name: 'label', widths: [720, 360] },
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })

const manifest = {}
for (const job of JOBS) {
  for (const width of job.widths) {
    const dataUri = await page.evaluate(
      async ({ src, width }) => {
        const img = new Image()
        img.src = `/assets/site/${src}`
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = Math.round((img.height / img.width) * width)
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/webp', 0.85)
      },
      { src: job.src, width },
    )
    const file = `${job.name}-${width}.webp`
    fs.writeFileSync(`${OUT}/${file}`, Buffer.from(dataUri.split(',')[1], 'base64'))
    manifest[`${job.name}-${width}`] = dataUri
    console.log(file, Math.round(fs.statSync(`${OUT}/${file}`).size / 1024) + 'KB')
  }
}

fs.writeFileSync(process.argv[2] + '/site-images.json', JSON.stringify(manifest))
await browser.close()
