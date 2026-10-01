// Renders a 15s 1080x1920 Instagram reel to social/reel/reel.mp4 (silent: add audio in Instagram).
// Run with: node scripts/make-reel.mjs  (needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg)
// The animation is plain HTML driven by render(t); each frame is screenshotted and piped to ffmpeg.
// Content stays inside Instagram's reel safe zone: clear of the top ~250px, the caption area in
// the bottom ~420px, and the like/comment buttons down the right edge.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const FPS = 30
const SECONDS = 15
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const outDir = new URL('../social/reel/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

const INK = '#1f1a0e'
const CREAM = '#fffbea'
const BANANA = '#ffd23f'
const LEAF = '#2f8f46'
const NIGHT = '#17150f'

const mark = (t, bg = CREAM) =>
  `<span style="background:${bg};color:${INK};padding:0 16px;border-radius:20px;box-decoration-break:clone;-webkit-box-decoration-break:clone">${t}</span>`

// A scene is visible from `from` to `to` seconds and fades at both ends.
const scene = (from, to, bg, color, inner) =>
  `<section class="scene" data-from="${from}" data-to="${to}" style="background:${bg};color:${color}">${inner}</section>`

const tile = (word, at) =>
  `<span data-pop="${at}" style="background:#fff;border:5px solid ${INK};border-radius:30px;box-shadow:0 12px 0 ${INK};padding:20px 30px;font-family:ui-monospace,Menlo,monospace;font-size:76px;font-weight:800">${word}</span>`

const dot = (at) => `<span data-pop="${at}" style="font-size:90px;font-weight:900;line-height:1">.</span>`

const item = (emoji, name, at, tickAt) => `
  <div data-pop="${at}" style="display:flex;align-items:center;gap:16px;padding:20px 0;border-top:2px solid #efe4bf;font-size:40px">
    <span data-tick="${tickAt}" class="box"></span><span>${emoji}</span><span class="name">${name}</span>
  </div>`

const phone = (label, items) => `
  <div style="width:410px;height:640px;box-sizing:border-box;background:#fff;color:${INK};border:6px solid ${INK};border-radius:56px;box-shadow:0 16px 0 ${INK};padding:34px 30px">
    <div style="font-size:28px;font-weight:800;color:#6b6250;text-align:center">${label}</div>
    <div style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:32px;margin:18px 0 10px">lemon.fork.bulb</div>
    ${items}
  </div>`

// Items appear on "You" first, then sync to "At the shop" a beat later; the shopper ticks bananas.
const list = [
  ['🍌', 'Bananas', 7.2],
  ['🥛', 'Milk', 7.7],
  ['🥚', 'Eggs', 8.2],
  ['🥖', 'Bread', 8.7],
]
const SYNC = 0.4
const TICK = 9.5

const chip = (t, at) =>
  `<span data-pop="${at}" style="background:#211e16;color:#f6efd9;border:4px solid ${BANANA};border-radius:999px;padding:18px 36px;font-size:46px;font-weight:800;box-shadow:0 7px 0 ${BANANA}">${t}</span>`

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin:0; width:1080px; height:1920px; overflow:hidden; position:relative; background:${CREAM};
    font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; color:${INK} }
  .scene { position:absolute; inset:0; padding:360px 140px 0 84px; box-sizing:border-box; opacity:0 }
  .h { font-size:112px; line-height:1; font-weight:900; letter-spacing:-0.045em }
  .sub { font-size:50px; font-weight:750; line-height:1.25; letter-spacing:-0.01em }
  [data-pop] { display:inline-block; opacity:0 }
  .box { flex:none; width:38px; height:38px; border-radius:50%; box-sizing:border-box; border:3px solid #cfc5a5;
    display:grid; place-items:center; color:#fff; font-size:26px; font-weight:900 }
  .box.on { background:${LEAF}; border-color:${LEAF} }
  .box.on::after { content:'✓' }
  .box.on ~ .name { text-decoration:line-through; color:#8a8069 }
</style></head><body>

${scene(
  0,
  3,
  CREAM,
  INK,
  `
  <div class="h" data-pop="0.15" style="display:block">POV: you get home and…</div>
  <div class="h" data-pop="1.1" style="display:block;margin-top:40px">${mark('forgot the bananas.', BANANA)}</div>
  <div data-pop="1.5" data-wobble style="display:block;font-size:380px;text-align:center;margin-top:90px">🍌</div>`,
)}

${scene(
  3,
  6.6,
  BANANA,
  INK,
  `
  <div class="h" data-pop="3.15" style="display:block">Start a list.</div>
  <div class="h" data-pop="3.55" style="display:block;margin-top:20px">Get ${mark('three words')}.</div>
  <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:110px;transform:rotate(-3deg)">
    ${tile('lemon', 4.0)}${dot(4.15)}${tile('fork', 4.3)}${dot(4.45)}${tile('bulb', 4.6)}
  </div>
  <div class="sub" data-pop="5.3" style="display:block;margin-top:110px">Send them to whoever you shop with. No app, no signup.</div>`,
)}

${scene(
  6.6,
  10.6,
  LEAF,
  '#fff',
  `
  <div class="h" data-pop="6.75" style="display:block">It syncs ${mark('live', BANANA)}.</div>
  <div style="display:flex;justify-content:center;gap:40px;margin-top:90px">
    ${phone('You', list.map(([e, n, at]) => item(e, n, at, n === 'Bananas' ? TICK + SYNC : 99)).join(''))}
    ${phone('At the shop', list.map(([e, n, at]) => item(e, n, at + SYNC, n === 'Bananas' ? TICK : 99)).join(''))}
  </div>`,
)}

${scene(
  10.6,
  12.8,
  NIGHT,
  '#f6efd9',
  `
  <div class="h" data-pop="10.75" style="display:block">Built for the ${mark('shop', BANANA)}.</div>
  <div style="display:flex;flex-wrap:wrap;gap:26px;margin-top:90px">
    ${chip('No signup', 11.0)}${chip('Sorted by aisle', 11.2)}${chip('Works offline', 11.4)}${chip('Free', 11.6)}
  </div>`,
)}

${scene(
  12.8,
  99,
  BANANA,
  INK,
  `
  <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:60px">
    <span data-pop="12.95" style="display:block;width:220px;height:220px;border-radius:56px;box-shadow:0 0 0 8px ${INK}">${svg.replace('<svg ', '<svg width="220" height="220" ')}</span>
    <div class="h" data-pop="13.2" style="display:block;margin-top:60px">we need bananas</div>
    <div class="sub" data-pop="13.5" style="display:block;margin-top:30px">The shopping list you share with three words.</div>
    <div data-pop="13.9" style="display:block;margin-top:80px;font-size:66px;font-weight:900;letter-spacing:-0.03em">weneedbananas.com</div>
    <span data-pop="14.2" style="margin-top:30px;background:${INK};color:${CREAM};border-radius:999px;padding:16px 36px;font-size:40px;font-weight:850">link in bio</span>
  </div>`,
)}

<script>
  const clamp = (x) => Math.max(0, Math.min(1, x))
  const backOut = (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2)
  window.render = (t) => {
    for (const s of document.querySelectorAll('.scene')) {
      const from = +s.dataset.from, to = +s.dataset.to
      s.style.opacity = Math.min(clamp((t - from) / 0.25 + (from === 0 ? 1 : 0)), clamp((to - t) / 0.25))
    }
    for (const el of document.querySelectorAll('[data-pop]')) {
      const p = clamp((t - +el.dataset.pop) / 0.45)
      const wobble = el.hasAttribute('data-wobble') && p === 1 ? Math.sin((t - +el.dataset.pop) * 6) * 8 : 0
      el.style.opacity = clamp(p * 2.5)
      el.style.transform = 'translateY(' + (1 - p) * 40 + 'px) scale(' + (0.6 + 0.4 * backOut(p)) + ') rotate(' + wobble + 'deg)'
    }
    for (const el of document.querySelectorAll('[data-tick]')) el.classList.toggle('on', t >= +el.dataset.tick)
  }
</script>
</body></html>`

const ffmpeg = spawn(
  process.env.FFMPEG || 'ffmpeg',
  // prettier-ignore
  ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
   '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', `${outDir}reel.mp4`],
  { stdio: ['pipe', 'inherit', 'inherit'] },
)
const done = new Promise((resolve, reject) =>
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))),
)

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
await tab.setContent(html)
for (let f = 0; f < FPS * SECONDS; f++) {
  await tab.evaluate((t) => window.render(t), f / FPS)
  const frame = await tab.screenshot({ type: 'png' })
  if (!ffmpeg.stdin.write(frame)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
}
ffmpeg.stdin.end()
await done
await browser.close()
console.log('reel written to social/reel/reel.mp4')
