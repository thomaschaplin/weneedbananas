// Regenerates the PNG icons and social card in public/ from inline HTML.
// Run with: node scripts/make-images.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const out = (f) => new URL(`../public/${f}`, import.meta.url).pathname

const browser = await chromium.launch()
const page = await browser.newPage()

async function icon(file, size, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size })
  const inner = maskable ? Math.round(size * 0.72) : size
  const bg = maskable ? '#ffd23f' : 'transparent'
  await page.setContent(
    `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${bg}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body>`,
  )
  await page.screenshot({ path: out(file), omitBackground: !maskable })
}

await icon('icon-192.png', 192)
await icon('icon-512.png', 512)
await icon('icon-512-maskable.png', 512, { maskable: true })
await icon('apple-touch-icon.png', 180, { maskable: true })

await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(`
<body style="margin:0;width:1200px;height:630px;background:#fffbea;font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f1a0e;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box">
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:16px;font-size:34px;font-weight:800;letter-spacing:-0.02em">
      ${svg.replace('<svg ', '<svg width="64" height="64" ')} we need bananas
    </div>
    <div style="font-size:70px;line-height:1.02;font-weight:850;letter-spacing:-0.04em;margin:34px 0 26px">
      The shopping list you share with <span style="background:linear-gradient(transparent 58%,#ffd23f 58%,#ffd23f 92%,transparent 92%)">three words</span>.
    </div>
    <div style="font-size:30px;color:#6b6250">No signup · sorted by aisle · works offline</div>
  </div>
  <div style="width:330px;background:#fff;border:2px solid #efe4bf;border-radius:28px;padding:22px;box-shadow:0 10px 40px rgba(60,45,0,.12);transform:rotate(2deg)">
    <div style="font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:22px;margin-bottom:14px">lemon.fork.bulb</div>
    ${['🍌 Bananas|6|1', '🧄 Garlic||0', '🥖 Sourdough||0', '🥛 Milk|2 pints|0', '🥚 Eggs||0']
      .map((r) => {
        const [n, q, d] = r.split('|')
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #efe4bf;font-size:22px">
          <span style="width:24px;height:24px;border-radius:50%;border:2px solid ${d === '1' ? '#2f8f46' : '#cfc5a5'};background:${d === '1' ? '#2f8f46' : 'transparent'}"></span>
          <span style="${d === '1' ? 'text-decoration:line-through;color:#6b6250' : ''}">${n}</span>
          <span style="margin-left:auto;color:#6b6250">${q}</span></div>`
      })
      .join('')}
  </div>
</body>`)
await page.screenshot({ path: out('og.png') })

await browser.close()
console.log('images written to public/')
