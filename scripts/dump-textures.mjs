// Dev tool: renders every baked sprite texture at 6x on a checkerboard so the
// trim/fit/recolor pass in src/game/textures.ts can be eyeballed, rather than
// judged from 24px sprites moving down a 720x960 canvas.
//
//   npm run dev            # in another terminal
//   node scripts/dump-textures.mjs <out-dir>
import { chromium } from 'playwright'
import path from 'path'

const OUT = process.argv[2] || '.'
const URL = 'http://localhost:5173/'
const KEYS = [
  'player',
  'gummy-meteor',
  'jawbreaker',
  'sour-comet',
  'candy-magnet',
  'candy-heart',
  'hop-nebula-dust',
  'malt-meteorite',
  'candy-star',
]

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Play' }).click()
await page.waitForSelector('canvas')
await page.waitForTimeout(1500)

await page.evaluate((keys) => {
  const tex = window.__game.textures
  const cards = keys
    .map((k) => {
      if (!tex.exists(k))
        return `<div class="card">${k}<br><b>MISSING</b></div>`
      const img = tex.get(k).getSourceImage()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      return `<div class="card">
        <img src="${c.toDataURL()}" style="width:${img.width * 6}px;height:${img.height * 6}px">
        <div class="label">${k} — ${img.width}x${img.height}</div>
      </div>`
    })
    .join('')
  document.body.innerHTML = `<style>
    body{margin:0;background:#12182b;font:13px monospace;color:#dfe6ff}
    .grid{display:flex;flex-wrap:wrap;gap:18px;padding:18px;align-items:flex-end}
    .card{text-align:center}
    .card img{
      image-rendering:pixelated;
      background-image:linear-gradient(45deg,#2a3350 25%,transparent 25%),
        linear-gradient(-45deg,#2a3350 25%,transparent 25%),
        linear-gradient(45deg,transparent 75%,#2a3350 75%),
        linear-gradient(-45deg,transparent 75%,#2a3350 75%);
      background-size:16px 16px;
      background-position:0 0,0 8px,8px -8px,-8px 0;
    }
    .label{margin-top:6px}
  </style><div class="grid">${cards}</div>`
}, KEYS)

await page.screenshot({ path: path.join(OUT, 'textures.png'), fullPage: true })
await browser.close()
console.log('wrote', path.join(OUT, 'textures.png'))
