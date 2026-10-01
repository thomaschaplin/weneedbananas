// Renders Instagram images: 1080x1920 stories to social/stories/story-N.png and
// 1080x1350 feed posts to social/posts/post-N.png, and a 1080x1080 profile picture to social/profile.png.
// Run with: node scripts/make-social.mjs
// Every story keeps the top ~250px and bottom ~290px clear for Instagram's UI,
// and leaves a gap above the footer where a link sticker can sit. Posts keep
// their text inside the 3:4 crop the profile grid shows.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const dir = (name) => {
  const path = new URL(`../social/${name}/`, import.meta.url).pathname
  mkdirSync(path, { recursive: true })
  return path
}

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

const postFooter = (color = INK, pill = BANANA, pillInk = INK) => `
  <div style="position:absolute;left:84px;right:84px;bottom:70px;display:flex;align-items:center;justify-content:space-between;color:${color}">
    <span style="font-size:46px;font-weight:900;letter-spacing:-0.03em">weneedbananas.com</span>
    <span style="background:${pill};color:${pillInk};border-radius:999px;padding:12px 26px;font-size:30px;font-weight:850">link in bio</span>
  </div>`

const page = ({ bg, color = INK, deco = '', body, height = 1920, top = 250, foot = footer(color) }) => `
<body style="margin:0;width:1080px;height:${height}px;overflow:hidden;background:${bg};font-family:ui-rounded,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${color};position:relative">
  ${deco}
  <div style="position:relative;padding:${top}px 84px 0">${body}</div>
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

const post = (opts) =>
  page({
    height: 1350,
    top: 84,
    foot: opts.bg === BANANA ? postFooter(INK, INK, CREAM) : postFooter(opts.color),
    ...opts,
  })

const tile = (t) =>
  `<span style="background:#fff;border:4px solid ${INK};border-radius:28px;box-shadow:0 10px 0 ${INK};padding:18px 30px;font-family:ui-monospace,Menlo,monospace;font-size:66px;font-weight:800">${t}</span>`

const dot = `<span style="font-size:80px;font-weight:900;line-height:1">.</span>`

const posts = [
  // 1. The hero: three words.
  post({
    bg: BANANA,
    deco: bigBanana('right:-60px;top:-50px;font-size:300px;transform:rotate(-24deg)'),
    body: `${logo()}
      ${headline(`The shopping list you share with ${mark('three words')}.`, 92)}
      ${card(
        listHead('lemon.fork.bulb') +
          [
            ['🍌', 'Bananas', '6', true],
            ['🥖', 'Sourdough', '', false],
            ['🥛', 'Milk', '2 pints', false],
            ['🥚', 'Eggs', '12', false],
          ]
            .map(row)
            .join(''),
        { rotate: -2 },
      )}
      <div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:60px">
        ${['No signup', 'Sorted by aisle', 'Works offline'].map((t) => chip(t)).join('')}
      </div>`,
  }),

  // 2. The words are the whole login.
  post({
    bg: CREAM,
    body: `${logo()}
      ${headline(`No account.<br>No password.<br>Just ${mark('three words', BANANA)}.`, 104)}
      <div style="display:flex;align-items:flex-end;justify-content:center;gap:10px;margin-top:90px;transform:rotate(-3deg)">
        ${tile('lemon')}${dot}${tile('fork')}${dot}${tile('bulb')}
      </div>
      <div style="margin-top:70px;font-size:40px;font-weight:700;color:#6b6250;text-align:center">Anyone with the words is on the list.</div>`,
  }),

  // 3. Quantities merge.
  post({
    bg: LEAF,
    color: '#fff',
    body: `${logo('#fff', '#fff')}
      ${headline(`Add 6 eggs twice.<br>Get ${mark('12 eggs', BANANA)}.`, 100, '#fff')}
      <div style="display:flex;flex-direction:column;gap:22px;margin-top:64px;font-size:40px;font-weight:700">
        ${['6 eggs', 'eggs x6']
          .map(
            (t) =>
              `<div style="align-self:flex-start;background:rgba(255,255,255,.16);border:3px dashed rgba(255,255,255,.7);border-radius:24px;padding:18px 30px">+ ${t}</div>`,
          )
          .join('')}
      </div>
      <div style="font-size:64px;font-weight:900;margin:14px 0 0 40px">↓</div>
      ${card(row(['🥚', 'Eggs', '12', false]).replace('border-top:2px solid #efe4bf;', ''), { rotate: 0, width: 700 })
        .replace('margin:56px 0 0 24px', 'margin:14px 0 0 0')
        .replace('padding:28px 40px 8px', 'padding:14px 40px')}
      <div style="margin-top:44px;font-size:34px;font-weight:650;opacity:.9">"2 pints milk", "500g mince", "bananas x6": it understands.</div>`,
  }),

  // 4. Shop mode.
  post({
    bg: CREAM,
    deco: bigBanana('right:-40px;bottom:200px;font-size:240px;transform:rotate(-20deg)'),
    body: `${logo()}
      ${headline(`Shop mode.<br>${mark('One lap.', BANANA)}`, 100)}
      <div style="display:flex;flex-direction:column;gap:24px;margin-top:60px;font-size:42px;font-weight:750;max-width:700px">
        ${[
          ['👍', 'Big one-thumb buttons'],
          ['☀️', 'Screen stays awake'],
          ['🗺️', 'Aisle by aisle, in order'],
          ['🏁', '"7 left" so you know how close you are'],
        ]
          .map(
            ([e, t]) =>
              `<div style="display:flex;gap:24px;align-items:center"><span style="flex:none;width:84px;height:84px;border-radius:24px;background:#fff;border:4px solid ${INK};box-sizing:border-box;display:grid;place-items:center;font-size:44px">${e}</span>${t}</div>`,
          )
          .join('')}
      </div>`,
  }),

  // 5. Who's at the shop.
  post({
    bg: NIGHT,
    color: '#f6efd9',
    deco: `<div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 25%,rgba(255,210,63,.22) 0,transparent 50%)"></div>`,
    body: `${logo('#f6efd9', BANANA)}
      ${headline(`Know when someone's ${mark('at the shop', BANANA)}.`, 100, '#f6efd9')}
      <div style="margin-top:70px;background:#2b2616;border:3px solid ${BANANA};border-radius:32px;padding:34px 40px;font-size:40px;line-height:1.35;box-shadow:0 14px 40px rgba(0,0,0,.4)">
        🛒 <b>Sam</b> is at the shop. Add anything you need now.
      </div>
      <div style="margin-top:56px;font-size:40px;font-weight:700;color:#b3a888;line-height:1.3">The perfect moment to add the thing you just remembered.</div>`,
  }),

  // 6. Out of stock.
  post({
    bg: BANANA,
    deco: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent 0 60px,rgba(255,255,255,.18) 60px 120px)"></div>`,
    body: `${logo()}
      ${headline(`Out of stock?<br>${mark("It'll wait.")}`, 104)}
      ${card(
        listHead('lemon.fork.bulb') +
          row([
            '🥑',
            'Avocados',
            `<span style="background:#fde9df;color:#b93815;font-weight:800;font-size:26px;padding:8px 18px;border-radius:999px;white-space:nowrap">🤷 couldn’t find it</span>`,
            false,
          ]) +
          [
            ['🍌', 'Bananas', '6', true],
            ['🥛', 'Milk', '2 pints', true],
          ]
            .map(row)
            .join(''),
        { rotate: 2 },
      )}
      <div style="margin-top:56px;font-size:38px;font-weight:700;max-width:860px">Mark it and it stays on the list for next time.</div>`,
  }),
]

const browser = await chromium.launch()
const tab = await browser.newPage()
for (const [name, folder, list, height] of [
  ['story', 'stories', stories, 1920],
  ['post', 'posts', posts, 1350],
]) {
  const out = dir(folder)
  await tab.setViewportSize({ width: 1080, height })
  for (const [i, html] of list.entries()) {
    await tab.setContent(html)
    await tab.screenshot({ path: `${out}${name}-${i + 1}.png` })
  }
  console.log(`${list.length} images written to social/${folder}/`)
}

// Profile picture: the logo's banana on full-bleed yellow, sized to sit inside Instagram's circular crop.
await tab.setViewportSize({ width: 1080, height: 1080 })
await tab.setContent(`
<body style="margin:0;width:1080px;height:1080px;background:${BANANA};display:grid;place-items:center">
  ${svg.replace(/<rect[^>]*\/>/, '').replace('<svg ', '<svg width="940" height="940" style="margin:30px 0 0 20px" ')}
</body>`)
await tab.screenshot({ path: `${dir('.')}profile.png` })
console.log('profile picture written to social/profile.png')
await browser.close()
