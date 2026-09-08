// CAVEAT — software rendering (SwiftShader) can show rotated sprites as clipped
// wedges/crescents that DO NOT reproduce on real GPU hardware. Verified
// 2026-09-07: identical rotated gummy-meteor sprites rendered as clean, whole
// shapes in a headed browser using real GPU (ANGLE/D3D11), at every angle
// tested, while the same scene under `--use-angle=swiftshader` clipped some
// angles unpredictably (non-monotonic with texture-frame padding size — not a
// real deficiency in src/game/textures.ts's frame padding). If a screenshot
// from this script shows a "bite" out of a rotating obstacle, re-check with
// `chromium.launch({ headless: false })` (real GPU) before treating it as a
// product bug.
import { chromium } from 'playwright'
import path from 'path'

const OUT = process.argv[2] || '.'
const URL = 'http://localhost:5173/'

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
})
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    errors.push(`${m.type()}: ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) =>
  errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`),
)

await page.goto(URL, { waitUntil: 'networkidle' })
// IntroSplash no longer auto-dismisses (2026-09-08 — dismissal now requires
// a real click/keypress, so background music reliably gets a user gesture).
// Dismiss it explicitly, then wait out its fade before clicking Play, since
// the splash stays in the DOM (at opacity-0) intercepting clicks until its
// FADE_MS timeout actually unmounts it.
await page.getByRole('button', { name: 'Enter site' }).click()
await page.waitForTimeout(900)
await page.getByRole('button', { name: 'Play', exact: true }).first().click()
await page.waitForSelector('canvas', { timeout: 10000 })

const probe = async (label) => {
  const state = await page.evaluate(() => {
    const g = window.__game
    if (!g) return { error: 'no window.__game' }
    const scene = g.scene.getScene('PlayScene')
    const tex = g.textures
    const keys = [
      'player',
      'gummy-meteor',
      'jawbreaker',
      'sour-comet',
      'candy-star',
      'candy-magnet',
      'candy-heart',
      'hop-nebula-dust',
      'malt-meteorite',
      'bg-far',
      'bg-near',
    ]
    const textures = keys.map((k) => {
      if (!tex.exists(k)) return { k, missing: true }
      const img = tex.get(k).getSourceImage()
      // Count non-transparent pixels so a silently-blank bake is caught.
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, img.width, img.height).data
      let opaque = 0
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) opaque += 1
      return {
        k,
        size: `${img.width}x${img.height}`,
        fill: +(opaque / (img.width * img.height)).toFixed(2),
      }
    })
    const group = (name) => {
      const grp = scene && scene[name]
      if (!grp) return null
      return grp.getChildren().map((o) => ({
        t: o.texture.key,
        x: Math.round(o.x),
        y: Math.round(o.y),
        vy: Math.round(o.body ? o.body.velocity.y : NaN),
        vis: o.visible,
        size: `${Math.round(o.displayWidth)}x${Math.round(o.displayHeight)}`,
      }))
    }
    return {
      activeScenes: g.scene.getScenes(true).map((s) => s.scene.key),
      obstacles: group('obstacles'),
      collectibles: group('collectibles'),
      powerups: group('powerups'),
      textures,
    }
  })
  console.log(`\n===== ${label} =====`)
  console.log(JSON.stringify(state, null, 1))
  await page.screenshot({ path: path.join(OUT, `play-${label}.png`) })
}

await page.waitForTimeout(3000)
await probe('t3s')
await page.waitForTimeout(9000)
await probe('t12s')

console.log('\n===== console/network issues =====')
console.log(errors.length ? errors.slice(0, 20).join('\n') : '(none)')

await browser.close()
