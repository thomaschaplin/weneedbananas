// Renders a 1080x1920 Instagram story image to public/story.png.
// Run with: node scripts/make-story.mjs
// Keeps the top ~250px and bottom ~300px clear for Instagram's UI, and leaves
// a gap above the footer where a link sticker can sit.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const out = new URL('../public/story.png', import.meta.url).pathname

const items = [
  ['🍌', 'Bananas', '6', true],
  ['🧄', 'Garlic', '', true],
  ['🥖', 'Sourdough', '', false],
  ['🥛', 'Milk', '2 pints', false],
  ['🥚', 'Eggs', '12', false],
]

const row = ([e, n, q, d]) => `
  <div style="display:flex;align-items:center;gap:20px;padding:15px 0;border-top:2px solid #efe4bf;font-size:36px">
    <span style="flex:none;width:40px;height:40px;border-radius:50%;box-sizing:border-box;border:3px solid ${d ? '#2f8f46' : '#cfc5a5'};background:${d ? '#2f8f46' : 'transparent'};display:grid;place-items:center;color:#fff;font-size:28px;font-weight:900">${d ? '✓' : ''}</span>
    <span>${e}</span>
    <span style="${d ? 'text-decoration:line-through;color:#8a8069' : ''}">${n}</span>
    <span style="margin-left:auto;color:#6b6250;font-size:30px">${q}</span>
  </div>`

const chip = (t) =>
  `<span style="background:#fff;border:3px solid #1f1a0e;border-radius:999px;padding:12px 26px;font-size:31px;font-weight:750;box-shadow:0 5px 0 #1f1a0e">${t}</span>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
await page.setContent(`
<body style="margin:0;width:1080px;height:1920px;overflow:hidden;background:#ffd23f;font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1f1a0e;position:relative">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,#ffe27a 0,transparent 45%),radial-gradient(circle at 10% 90%,#ffc619 0,transparent 50%)"></div>
  <div style="position:absolute;right:-70px;top:-30px;font-size:330px;transform:rotate(-24deg)">🍌</div>

  <div style="position:relative;padding:250px 84px 0">
    <div style="display:flex;align-items:center;gap:22px;font-size:48px;font-weight:800;letter-spacing:-0.02em">
      <span style="display:block;width:92px;height:92px;border-radius:24px;box-shadow:0 0 0 4px #1f1a0e">${svg.replace('<svg ', '<svg width="92" height="92" ')}</span>
      we need bananas
    </div>

    <div style="font-size:98px;line-height:1;font-weight:900;letter-spacing:-0.045em;margin:44px 0 0">
      The shopping list you share with <span style="background:#fffbea;padding:0 14px;border-radius:18px;box-decoration-break:clone;-webkit-box-decoration-break:clone">three words</span>.
    </div>

    <div style="margin:56px 0 0 24px;width:800px;background:#fff;border:4px solid #1f1a0e;border-radius:40px;padding:28px 40px 8px;box-shadow:0 14px 0 #1f1a0e;transform:rotate(-2.5deg)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:38px">lemon.fork.bulb</span>
        <span style="background:#e3f4e6;color:#2f8f46;font-weight:800;font-size:26px;padding:8px 18px;border-radius:999px">● synced</span>
      </div>
      ${items.map(row).join('')}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:62px">
      ${['No signup', 'Sorted by aisle', 'Works offline'].map(chip).join('')}
    </div>
  </div>

  <div style="position:absolute;left:0;right:0;bottom:290px;text-align:center">
    <div style="font-size:40px;font-weight:800">↓ tap the link to start a list ↓</div>
    <div style="margin-top:14px;font-size:58px;font-weight:900;letter-spacing:-0.03em">weneedbananas.com</div>
  </div>
</body>`)
await page.screenshot({ path: out })
await browser.close()
console.log('story written to public/story.png')
