// Renders 1080x1920 Instagram story images to public/stories/story-N.png.
// Run with: node scripts/make-story.mjs
// Every story keeps the top ~250px and bottom ~290px clear for Instagram's UI,
// and leaves a gap above the footer where a link sticker can sit.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const outDir = new URL('../public/stories/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

const INK = '#1f1a0e'
const CREAM = '#fffbea'
const BANANA = '#ffd23f'
const LEAF = '#2f8f46'
const NIGHT = '#17150f'

const logo = (color = INK, ring = INK) => `
  <div style="display:flex;align-items:center;gap:22px;font-size:48px;font-weight:800;letter-spacing:-0.02em;color:${color}">
    <span style="display:block;width:92px;height:92px;border-radius:24px;box-shadow:0 0 0 4px ${ring}">${svg.replace('<svg ', '<svg width="92" height="92" ')}</span>
    we need bananas
  </div>`

const headline = (html, size = 98, color = INK) =>
  `<div style="font-size:${size}px;line-height:1;font-weight:900;letter-spacing:-0.045em;margin-top:44px;color:${color}">${html}</div>`

const mark = (t, bg = CREAM, fg = INK) =>
  `<span style="background:${bg};color:${fg};padding:0 14px;border-radius:18px;box-decoration-break:clone;-webkit-box-decoration-break:clone">${t}</span>`

const chip = (t, bg = '#fff', fg = INK, edge = INK) =>
  `<span style="background:${bg};color:${fg};border:3px solid ${edge};border-radius:999px;padding:12px 26px;font-size:31px;font-weight:750;box-shadow:0 5px 0 ${edge}">${t}</span>`

const card = (inner, { rotate = -2.5, edge = INK, width = 800 } = {}) => `
  <div style="margin:56px 0 0 24px;width:${width}px;box-sizing:border-box;background:#fff;color:${INK};border:4px solid ${edge};border-radius:40px;padding:28px 40px 8px;box-shadow:0 14px 0 ${edge};transform:rotate(${rotate}deg)">${inner}</div>`

const row = ([e, n, q, d]) => `
  <div style="display:flex;align-items:center;gap:20px;padding:15px 0;border-top:2px solid #efe4bf;font-size:36px">
    <span style="flex:none;width:40px;height:40px;border-radius:50%;box-sizing:border-box;border:3px solid ${d ? LEAF : '#cfc5a5'};background:${d ? LEAF : 'transparent'};display:grid;place-items:center;color:#fff;font-size:28px;font-weight:900">${d ? '✓' : ''}</span>
    <span>${e}</span>
    <span style="${d ? 'text-decoration:line-through;color:#8a8069' : ''}">${n}</span>
    <span style="margin-left:auto;color:#6b6250;font-size:30px">${q}</span>
  </div>`

const listHead = (words, badge = '● synced') => `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <span style="font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:38px">${words}</span>
    <span style="background:#e3f4e6;color:${LEAF};font-weight:800;font-size:26px;padding:8px 18px;border-radius:999px;white-space:nowrap">${badge}</span>
  </div>`

const aisle = (name) =>
  `<div style="padding:18px 0 4px;font-size:24px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#a07800">${name}</div>`

const footer = (color = INK, cta = 'tap the link to start a list') => `
  <div style="position:absolute;left:0;right:0;bottom:290px;text-align:center;color:${color}">
    <div style="font-size:40px;font-weight:800">↓ ${cta} ↓</div>
    <div style="margin-top:14px;font-size:58px;font-weight:900;letter-spacing:-0.03em">weneedbananas.com</div>
  </div>`

const page = ({ bg, color = INK, deco = '', body, foot = footer(color) }) => `
<body style="margin:0;width:1080px;height:1920px;overflow:hidden;background:${bg};font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${color};position:relative">
  ${deco}
  <div style="position:relative;padding:250px 84px 0">${body}</div>
  ${foot}
</body>`

const bigBanana = (style) => `<div style="position:absolute;${style}">🍌</div>`

const stories = [
  // 1. The original: three words.
  page({
    bg: BANANA,
    deco: `<div style="position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,#ffe27a 0,transparent 45%),radial-gradient(circle at 10% 90%,#ffc619 0,transparent 50%)"></div>
      ${bigBanana('right:-70px;top:-30px;font-size:330px;transform:rotate(-24deg)')}`,
    body: `${logo()}
      ${headline(`The shopping list you share with ${mark('three words')}.`)}
      ${card(
        listHead('lemon.fork.bulb') +
          [
            ['🍌', 'Bananas', '6', true],
            ['🧄', 'Garlic', '', true],
            ['🥖', 'Sourdough', '', false],
            ['🥛', 'Milk', '2 pints', false],
            ['🥚', 'Eggs', '12', false],
          ]
            .map(row)
            .join(''),
      )}
      <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:62px">
        ${['No signup', 'Sorted by aisle', 'Works offline'].map((t) => chip(t)).join('')}
      </div>`,
  }),

  // 2. The relatable group-chat problem.
  page({
    bg: CREAM,
    deco: bigBanana('right:-80px;top:-40px;font-size:300px;transform:rotate(18deg)'),
    body: `${logo()}
      ${headline(`Stop texting the shopping list.`, 104)}
      <div style="display:flex;flex-direction:column;gap:20px;margin-top:60px;font-size:38px;font-weight:600">
        ${[
          ['l', 'can you grab milk?'],
          ['l', 'and bananas'],
          ['r', 'already in the shop… which milk??'],
          ['l', 'also eggs. did you get bread?'],
          ['r', 'I left 10 mins ago…'],
        ]
          .map(
            ([s, t]) =>
              `<div style="align-self:${s === 'l' ? 'flex-start' : 'flex-end'};max-width:680px;padding:20px 30px;border-radius:36px;${
                s === 'l'
                  ? `background:#efe4bf;border-bottom-left-radius:10px`
                  : `background:#3d7bf7;color:#fff;border-bottom-right-radius:10px`
              }">${t}</div>`,
          )
          .join('')}
      </div>
      <div style="margin-top:56px;font-size:52px;font-weight:850;letter-spacing:-0.02em;line-height:1.15">
        Share one list instead. ${mark('Everyone sees it live.', BANANA)}
      </div>`,
  }),

  // 3. Three steps.
  page({
    bg: LEAF,
    color: '#fff',
    deco: bigBanana('right:-70px;top:-30px;font-size:330px;transform:rotate(-24deg)'),
    body: `${logo('#fff', '#fff')}
      ${headline(`Three steps.<br>${mark('No signup.', BANANA)}`, 104, '#fff')}
      <div style="display:flex;flex-direction:column;gap:30px;margin-top:64px">
        ${[
          ['Start a list', 'You get three random words, like', 'lemon.fork.bulb'],
          ['Share the words', 'Text them, say them, scan the QR.', ''],
          ['Shop together', 'Ticks sync live between phones.', ''],
        ]
          .map(
            ([t, d, w], i) => `
          <div style="display:flex;gap:30px;align-items:flex-start;background:#fff;color:${INK};border:4px solid ${INK};border-radius:36px;padding:30px 36px;box-shadow:0 12px 0 ${INK}">
            <span style="flex:none;width:84px;height:84px;border-radius:50%;background:${BANANA};border:4px solid ${INK};box-sizing:border-box;display:grid;place-items:center;font-size:48px;font-weight:900">${i + 1}</span>
            <div>
              <div style="font-size:46px;font-weight:900;letter-spacing:-0.02em">${t}</div>
              <div style="font-size:32px;color:#6b6250;margin-top:6px">${d}${w ? ` <b style="font-family:ui-monospace,Menlo,monospace;color:${INK}">${w}</b>` : ''}</div>
            </div>
          </div>`,
          )
          .join('')}
      </div>`,
  }),

  // 4. Sorted by aisle.
  page({
    bg: BANANA,
    deco: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent 0 60px,rgba(255,255,255,.18) 60px 120px)"></div>`,
    body: `${logo()}
      ${headline(`Sorted by aisle.<br>${mark('Automatically.')}`, 104)}
      ${card(
        listHead('lime.cup.otter', '🛒 Sam is at the shop') +
          aisle('Fruit &amp; veg') +
          [
            ['🍌', 'Bananas', '6', true],
            ['🥑', 'Avocados', '2', true],
          ]
            .map(row)
            .join('') +
          aisle('Bakery') +
          row(['🥖', 'Sourdough', '', false]) +
          aisle('Dairy') +
          [
            ['🥛', 'Milk', '2 pints', false],
            ['🧀', 'Cheddar', '', false],
          ]
            .map(row)
            .join(''),
        { rotate: 2 },
      )}`,
  }),

  // 5. Private by design.
  page({
    bg: NIGHT,
    color: '#f6efd9',
    deco: `<div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 18%,rgba(255,210,63,.22) 0,transparent 45%),radial-gradient(circle at 15% 85%,rgba(255,210,63,.12) 0,transparent 45%)"></div>`,
    body: `${logo('#f6efd9', BANANA)}
      ${headline(`Your list never touches ${mark('our servers', BANANA)}.`, 100, '#f6efd9')}
      <div style="display:flex;align-items:center;justify-content:center;gap:28px;margin-top:80px">
        ${['You', 'Partner']
          .map(
            (who) => `
          <div style="width:250px;height:420px;box-sizing:border-box;border:6px solid #f6efd9;border-radius:44px;background:#211e16;padding:30px 24px;display:flex;flex-direction:column;gap:20px">
            <div style="font-size:26px;font-weight:800;color:#b3a888;text-align:center">${who}</div>
            ${['🍌', '🥛', '🥚', '🥖'].map((e, i) => `<div style="display:flex;align-items:center;gap:14px;font-size:34px"><span style="width:30px;height:30px;border-radius:50%;box-sizing:border-box;border:3px solid ${i < 2 ? '#5cc774' : '#5a5240'};background:${i < 2 ? '#5cc774' : 'transparent'}"></span>${e}<span style="flex:1;height:12px;border-radius:6px;background:#3a3426"></span></div>`).join('')}
          </div>`,
          )
          .join(
            `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:${BANANA};font-weight:900"><span style="font-size:72px;line-height:1">⇄</span><span style="font-size:24px;letter-spacing:.08em">DIRECT</span></div>`,
          )}
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:18px;margin-top:70px">
        ${['Phone to phone', 'No account', 'Works offline'].map((t) => chip(t, '#211e16', '#f6efd9', BANANA)).join('')}
      </div>`,
  }),

  // 6. Bold one-liner.
  page({
    bg: CREAM,
    deco: bigBanana('right:40px;top:1000px;font-size:300px;transform:rotate(-14deg)'),
    body: `${logo()}
      <div style="margin-top:56px;font-size:150px;line-height:.92;font-weight:900;letter-spacing:-0.055em">
        We<br>need<br>${mark('bananas.', BANANA)}
      </div>
      <div style="margin-top:44px;max-width:640px;font-size:50px;font-weight:800;letter-spacing:-0.02em;line-height:1.2">
        Never forget them&nbsp;again.<span style="display:block;margin-top:16px;color:#6b6250;font-weight:650;font-size:40px;line-height:1.3">A free shared shopping list. No app, no signup.</span>
      </div>`,
  }),
]

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [i, html] of stories.entries()) {
  await tab.setContent(html)
  await tab.screenshot({ path: `${outDir}story-${i + 1}.png` })
}
await browser.close()
console.log(`${stories.length} stories written to public/stories/`)
