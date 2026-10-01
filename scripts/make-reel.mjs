// Renders 1080x1920 Instagram reels to social/reels/reel-N.mp4 (silent: add audio in Instagram).
// Run with: node scripts/make-reel.mjs [N...]  (needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg)
// Each reel is plain HTML driven by render(t); every frame is screenshotted and piped to ffmpeg.
// Content stays inside Instagram's reel safe zone: clear of the top ~250px, the caption area in
// the bottom ~420px, and the like/comment buttons down the right edge.
//
// Animation attributes understood by render(t), all times in seconds:
//   data-pop="t"            pop in at t
//   data-show="t0,t1"       visible only from t0 until t1
//   data-type="t0,t1"       type out data-text between t0 and t1
//   data-move="t0,t1,dy"    slide down by dy px between t0 and t1
//   data-tick="t"           tick the checkbox at t
//   data-bar="t1,t2,..."    progress bar that fills one step at each time
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const FPS = 30
const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const outDir = new URL('../social/reels/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

const INK = '#1f1a0e'
const CREAM = '#fffbea'
const BANANA = '#ffd23f'
const LEAF = '#2f8f46'
const NIGHT = '#17150f'
const LIGHT = '#f6efd9'

const mark = (t, bg = CREAM) =>
  `<span style="background:${bg};color:${INK};padding:0 16px;border-radius:20px;box-decoration-break:clone;-webkit-box-decoration-break:clone">${t}</span>`

// A scene is visible from `from` to `to` seconds and fades at both ends.
const scene = (from, to, bg, color, inner) =>
  `<section class="scene" data-from="${from}" data-to="${to}" style="background:${bg};color:${color}">${inner}</section>`

const h = (html, at, style = '') => `<div class="h" data-pop="${at}" style="display:block;${style}">${html}</div>`
const sub = (html, at, style = '') => `<div class="sub" data-pop="${at}" style="display:block;${style}">${html}</div>`

const tile = (word, at) =>
  `<span data-pop="${at}" style="background:#fff;border:5px solid ${INK};border-radius:30px;box-shadow:0 12px 0 ${INK};padding:20px 30px;font-family:ui-monospace,Menlo,monospace;font-size:76px;font-weight:800">${word}</span>`

const dot = (at) => `<span data-pop="${at}" style="font-size:90px;font-weight:900;line-height:1">.</span>`

const item = (emoji, name, at, tickAt = 99, qty = '') => `
  <div data-pop="${at}" style="display:flex;align-items:center;gap:16px;padding:20px 0;border-top:2px solid #efe4bf;font-size:40px">
    <span data-tick="${tickAt}" class="box"></span><span>${emoji}</span><span class="name">${name}</span>
    <span style="margin-left:auto;color:#6b6250;font-size:36px">${qty}</span>
  </div>`

const card = (inner, style = '') =>
  `<div style="background:#fff;color:${INK};border:6px solid ${INK};border-radius:48px;box-shadow:0 16px 0 ${INK};padding:30px 40px 14px;${style}">${inner}</div>`

const words = (w = 'lemon.fork.bulb') =>
  `<div style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:36px;margin-bottom:10px">${w}</div>`

const phone = (label, items) => `
  <div style="width:410px;height:640px;box-sizing:border-box;background:#fff;color:${INK};border:6px solid ${INK};border-radius:56px;box-shadow:0 16px 0 ${INK};padding:34px 30px">
    <div style="font-size:28px;font-weight:800;color:#6b6250;text-align:center">${label}</div>
    <div style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:32px;margin:18px 0 10px">lemon.fork.bulb</div>
    ${items}
  </div>`

// A text box that types `text` between t0 and t1 and is only shown from t0 until `hide`.
const input = (text, t0, t1, hide) => `
  <div data-show="${t0},${hide}" style="position:absolute;inset:0;background:#fff;color:${INK};border:5px solid ${INK};border-radius:32px;padding:26px 34px;font-size:48px;font-weight:650">
    <span style="color:#a0977f">+ </span><span data-type="${t0},${t1}" data-text="${text}"></span><span class="caret">|</span>
  </div>`

const chip = (t, at) =>
  `<span data-pop="${at}" style="background:#211e16;color:${LIGHT};border:4px solid ${BANANA};border-radius:999px;padding:18px 36px;font-size:46px;font-weight:800;box-shadow:0 7px 0 ${BANANA}">${t}</span>`

const bubble = (side, text, at) =>
  `<div data-pop="${at}" style="display:block;width:fit-content;max-width:720px;${side === 'r' ? 'margin-left:auto;' : ''}padding:24px 34px;border-radius:40px;font-size:46px;font-weight:650;${
    side === 'l'
      ? 'background:#efe4bf;border-bottom-left-radius:12px'
      : 'background:#3d7bf7;color:#fff;border-bottom-right-radius:12px'
  }">${text}</div>`

const endCard = (at, tagline = 'The shopping list you share with three words.') =>
  scene(
    at,
    99,
    BANANA,
    INK,
    `
  <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:60px">
    <span data-pop="${at + 0.15}" style="display:block;width:220px;height:220px;border-radius:56px;box-shadow:0 0 0 8px ${INK}">${svg.replace('<svg ', '<svg width="220" height="220" ')}</span>
    ${h('we need bananas', at + 0.4, 'margin-top:60px')}
    ${sub(tagline, at + 0.7, 'margin-top:30px')}
    <div data-pop="${at + 1.1}" style="display:block;margin-top:80px;font-size:66px;font-weight:900;letter-spacing:-0.03em">weneedbananas.com</div>
    <span data-pop="${at + 1.4}" style="margin-top:30px;background:${INK};color:${CREAM};border-radius:999px;padding:16px 36px;font-size:40px;font-weight:850">link in bio</span>
  </div>`,
  )

const reels = []

// 1. Forgot the bananas: the overview.
{
  const list = [
    ['🍌', 'Bananas', 7.2],
    ['🥛', 'Milk', 7.7],
    ['🥚', 'Eggs', 8.2],
    ['🥖', 'Bread', 8.7],
  ]
  const SYNC = 0.4
  const TICK = 9.5
  reels.push({
    seconds: 15,
    html: `
${scene(
  0,
  3,
  CREAM,
  INK,
  `
  ${h('POV: you get home and…', 0.15)}
  ${h(mark('forgot the bananas.', BANANA), 1.1, 'margin-top:40px')}
  <div data-pop="1.5" data-wobble style="display:block;font-size:380px;text-align:center;margin-top:90px">🍌</div>`,
)}
${scene(
  3,
  6.6,
  BANANA,
  INK,
  `
  ${h('Start a list.', 3.15)}
  ${h(`Get ${mark('three words')}.`, 3.55, 'margin-top:20px')}
  <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:110px;transform:rotate(-3deg)">
    ${tile('lemon', 4.0)}${dot(4.15)}${tile('fork', 4.3)}${dot(4.45)}${tile('bulb', 4.6)}
  </div>
  ${sub('Send them to whoever you shop with. No app, no signup.', 5.3, 'margin-top:110px')}`,
)}
${scene(
  6.6,
  10.6,
  LEAF,
  '#fff',
  `
  ${h(`It syncs ${mark('live', BANANA)}.`, 6.75)}
  <div style="display:flex;justify-content:center;gap:40px;margin-top:90px">
    ${phone('You', list.map(([e, n, at]) => item(e, n, at, n === 'Bananas' ? TICK + SYNC : 99)).join(''))}
    ${phone('At the shop', list.map(([e, n, at]) => item(e, n, at + SYNC, n === 'Bananas' ? TICK : 99)).join(''))}
  </div>`,
)}
${scene(
  10.6,
  12.8,
  NIGHT,
  LIGHT,
  `
  ${h(`Built for the ${mark('shop', BANANA)}.`, 10.75)}
  <div style="display:flex;flex-wrap:wrap;gap:26px;margin-top:90px">
    ${chip('No signup', 11.0)}${chip('Sorted by aisle', 11.2)}${chip('Works offline', 11.4)}${chip('Free', 11.6)}
  </div>`,
)}
${endCard(12.8)}`,
  })
}

// 2. Group chat chaos.
reels.push({
  seconds: 13,
  html: `
${scene(
  0,
  6.6,
  CREAM,
  INK,
  `
  ${h('Me, texting the shopping list:', 0.15, 'font-size:96px')}
  <div style="display:flex;flex-direction:column;gap:22px;margin-top:70px">
    ${bubble('l', 'can you grab milk?', 0.9)}
    ${bubble('l', 'and bananas', 1.6)}
    ${bubble('r', 'which milk??', 2.4)}
    ${bubble('l', 'the normal one', 3.1)}
    ${bubble('l', 'oh and eggs. and bread', 3.8)}
    ${bubble('r', 'I’m already home…', 4.7)}
  </div>`,
)}
${scene(
  6.6,
  10.2,
  BANANA,
  INK,
  `
  ${h(`There’s a ${mark('better way')}.`, 6.75)}
  ${card(
    words() +
      [
        ['🥛', 'Milk', 7.4, '2 pints'],
        ['🍌', 'Bananas', 7.7, '6'],
        ['🥚', 'Eggs', 8.0, '12'],
        ['🥖', 'Bread', 8.3, ''],
      ]
        .map(([e, n, at, q]) => item(e, n, at, 99, q))
        .join(''),
    'margin-top:80px;transform:rotate(-2deg)',
  )}
  ${sub('One list. Everyone sees it live.', 8.9, 'margin-top:80px')}`,
)}
${endCard(10.2)}`,
})

// 3. Quantities merge.
reels.push({
  seconds: 12.5,
  html: `
${scene(
  0,
  9.5,
  LEAF,
  '#fff',
  `
  <div style="position:relative;height:230px">
    <div data-show="0,4.3" style="position:absolute;inset:0">${h('Add eggs twice?', 0.15)}</div>
    <div style="position:absolute;inset:0">${h(`Get ${mark('12 eggs', BANANA)}.`, 4.3)}</div>
  </div>
  <div style="position:relative;height:120px;margin-top:30px">
    ${input('6 eggs', 0.9, 1.6, 2.0)}
    ${input('eggs x6', 2.6, 3.4, 3.8)}
    ${input('2 pints milk', 5.4, 6.2, 6.6)}
    ${input('500g mince', 6.7, 7.4, 7.8)}
  </div>
  ${card(
    words() +
      item(
        '🥚',
        'Eggs',
        2.0,
        99,
        `<span data-show="2,3.8">6</span><span data-pop="3.8" style="background:${BANANA};color:${INK};font-weight:900;padding:2px 16px;border-radius:14px">12</span>`,
      ) +
      item('🥛', 'Milk', 6.6, 99, '2 pints') +
      item('🥩', 'Mince', 7.8, 99, '500g'),
    'margin-top:50px',
  )}
  ${sub('Not two lines of eggs. It understands quantities.', 8.4, 'margin-top:60px')}`,
)}
${endCard(9.5)}`,
})

// 4. Jumbled list sorts itself into aisles.
{
  const ROW = 84
  const HEAD = 60
  // [emoji, name, jumbled index, sorted top]
  const rows = [
    ['🥛', 'Milk', 0, HEAD * 3 + ROW * 4],
    ['🍌', 'Bananas', 1, HEAD],
    ['🥖', 'Bread', 2, HEAD * 2 + ROW * 2],
    ['🧀', 'Cheddar', 3, HEAD * 3 + ROW * 5],
    ['🍎', 'Apples', 4, HEAD + ROW],
    ['🥐', 'Croissants', 5, HEAD * 2 + ROW * 3],
  ]
  const heads = [
    ['Fruit &amp; veg', 0],
    ['Bakery', HEAD + ROW * 2],
    ['Dairy', HEAD * 2 + ROW * 4],
  ]
  const SORT = 3.0
  reels.push({
    seconds: 11.5,
    html: `
${scene(
  0,
  8.5,
  BANANA,
  INK,
  `
  <div style="position:relative;height:230px">
    <div data-show="0,${SORT}" style="position:absolute;inset:0">${h('Jumbled list?', 0.15)}</div>
    <div style="position:absolute;inset:0">${h(`Sorted by aisle. ${mark('Automatically.')}`, SORT, 'font-size:100px')}</div>
  </div>
  ${card(
    words() +
      `<div style="position:relative;height:${HEAD * 3 + ROW * 6}px">
      ${heads
        .map(
          ([n, top], i) =>
            `<div data-pop="${SORT + 0.9 + i * 0.15}" style="position:absolute;left:0;top:${top}px;height:${HEAD}px;display:flex;align-items:flex-end;padding-bottom:6px;box-sizing:border-box;font-size:28px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#a07800">${n}</div>`,
        )
        .join('')}
      ${rows
        .map(
          ([e, n, i, top], k) =>
            `<div data-move="${SORT + 0.1 + k * 0.05},${SORT + 0.9 + k * 0.05},${top - i * ROW}" style="position:absolute;left:0;right:0;top:${i * ROW}px">${item(e, n, 0.6 + i * 0.25)}</div>`,
        )
        .join('')}
    </div>`,
    'margin-top:50px',
  )}
  ${sub('In the order you walk the shop, so you get round in one lap.', 5.2, 'margin-top:60px')}`,
)}
${endCard(8.5)}`,
  })
}

// 5. Someone's at the shop.
reels.push({
  seconds: 10.5,
  html: `
${scene(
  0,
  7.5,
  NIGHT,
  LIGHT,
  `
  <div style="position:relative;height:230px">
    <div data-show="0,1.8" style="position:absolute;inset:0">${h('Sam’s out…', 0.15)}</div>
    <div style="position:absolute;inset:0">${h(`…and now ${mark('at the shop', BANANA)}.`, 1.8)}</div>
  </div>
  <div style="position:relative;margin-top:50px">
    <div data-pop="2.0" style="display:block;position:absolute;left:0;right:0;top:-20px;z-index:1;background:#2b2616;color:${LIGHT};border:4px solid ${BANANA};border-radius:32px;padding:26px 34px;font-size:40px;line-height:1.3;box-shadow:0 14px 40px rgba(0,0,0,.5)">
      🛒 <b>Sam</b> is at the shop. Add anything you need now.
    </div>
    ${card(
      `<div style="height:150px"></div>` +
        words() +
        item('🍌', 'Bananas', 0.6, 99, '6') +
        item('🥛', 'Milk', 0.8, 99, '2 pints') +
        item('🧻', 'Loo roll', 4.4, 99, ''),
    )}
  </div>
  <div style="position:relative;height:120px;margin-top:50px">${input('loo roll', 3.2, 3.9, 4.4)}</div>
  ${sub('The perfect moment to add the thing you just remembered.', 4.9, 'margin-top:20px')}`,
)}
${endCard(7.5)}`,
})

// 6. Shop mode countdown.
{
  const items = [
    ['🍌', 'Bananas'],
    ['🍎', 'Apples'],
    ['🥖', 'Bread'],
    ['🥛', 'Milk'],
    ['🧀', 'Cheddar'],
    ['🥚', 'Eggs'],
    ['🧻', 'Loo roll'],
  ]
  const ticks = items.map((_, i) => +(1.8 + i * 0.5).toFixed(2))
  const left = (n, from, to) =>
    `<span data-show="${from},${to}" style="position:absolute;left:0;top:0">${n === 0 ? 'All got! 🎉' : `${n} left`}</span>`
  reels.push({
    seconds: 10.5,
    html: `
${scene(
  0,
  7.5,
  CREAM,
  INK,
  `
  ${h(`Shop mode. ${mark('One lap.', BANANA)}`, 0.15)}
  ${card(
    `<div style="position:relative;height:56px;font-size:48px;font-weight:900">
      ${[7, ...ticks.map((_, i) => 6 - i)].map((n, i) => left(n, i === 0 ? 0 : ticks[i - 1], ticks[i] ?? 99)).join('')}
    </div>
    <div style="height:20px;border-radius:10px;background:#efe4bf;margin:16px 0 14px;overflow:hidden">
      <div data-bar="${ticks.join(',')}" style="height:100%;width:0;background:${LEAF};border-radius:10px"></div>
    </div>` + items.map(([e, n], i) => item(e, n, 0.6 + i * 0.08, ticks[i])).join(''),
    'margin-top:70px',
  )}
  ${sub('Big buttons. Screen stays awake. Done in one lap.', 5.6, 'margin-top:60px')}`,
)}
${endCard(7.5)}`,
  })
}

const page = (body) => `<!doctype html>
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
  .caret { font-weight:400; color:${LEAF} }
</style></head><body>
${body}
<script>
  const clamp = (x) => Math.max(0, Math.min(1, x))
  const backOut = (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2)
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
  const nums = (s) => s.split(',').map(Number)
  const all = (sel) => document.querySelectorAll(sel)
  window.render = (t) => {
    for (const s of all('.scene')) {
      const from = +s.dataset.from, to = +s.dataset.to
      s.style.opacity = Math.min(clamp((t - from) / 0.25 + (from === 0 ? 1 : 0)), clamp((to - t) / 0.25))
    }
    for (const el of all('[data-pop]')) {
      const p = clamp((t - +el.dataset.pop) / 0.45)
      const wobble = el.hasAttribute('data-wobble') && p === 1 ? Math.sin((t - +el.dataset.pop) * 6) * 8 : 0
      el.style.opacity = clamp(p * 2.5)
      el.style.transform = 'translateY(' + (1 - p) * 40 + 'px) scale(' + (0.6 + 0.4 * backOut(p)) + ') rotate(' + wobble + 'deg)'
    }
    for (const el of all('[data-show]')) {
      const [a, b] = nums(el.dataset.show)
      el.style.visibility = t >= a && t < b ? 'visible' : 'hidden'
    }
    for (const el of all('[data-type]')) {
      const [a, b] = nums(el.dataset.type)
      el.textContent = el.dataset.text.slice(0, Math.round(clamp((t - a) / (b - a)) * el.dataset.text.length))
    }
    for (const el of all('.caret')) el.style.opacity = Math.floor(t * 2.5) % 2 ? 0 : 1
    for (const el of all('[data-move]')) {
      const [a, b, dy] = nums(el.dataset.move)
      el.style.transform = 'translateY(' + easeInOut(clamp((t - a) / (b - a))) * dy + 'px)'
    }
    for (const el of all('[data-tick]')) el.classList.toggle('on', t >= +el.dataset.tick)
    for (const el of all('[data-bar]')) {
      const ts = nums(el.dataset.bar)
      el.style.width = (ts.filter((x) => t >= x).length / ts.length) * 100 + '%'
    }
  }
</script>
</body></html>`

async function render(tab, { seconds, html }, file) {
  const ffmpeg = spawn(
    process.env.FFMPEG || 'ffmpeg',
    // prettier-ignore
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
     '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', file],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const done = new Promise((resolve, reject) =>
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))),
  )
  await tab.setContent(page(html))
  for (let f = 0; f < Math.round(FPS * seconds); f++) {
    await tab.evaluate((t) => window.render(t), f / FPS)
    const frame = await tab.screenshot({ type: 'png' })
    if (!ffmpeg.stdin.write(frame)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
  }
  ffmpeg.stdin.end()
  await done
}

// Render every reel, or only the numbers given on the command line.
const only = process.argv.slice(2).map(Number)
const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [i, reel] of reels.entries()) {
  if (only.length && !only.includes(i + 1)) continue
  await render(tab, reel, `${outDir}reel-${i + 1}.mp4`)
  console.log(`social/reels/reel-${i + 1}.mp4 written`)
}
await browser.close()
