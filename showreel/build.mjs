// Renders showreel/reel.html frame by frame, synthesises the soundtrack and encodes the MP4.
// Usage: npm run showreel                    (the main reel in both formats, ~3 min each)
//        npm run showreel -- vertical        (one format: landscape or vertical)
//        npm run showreel -- alts            (all alternative edits in variants.js, vertical)
//        npm run showreel -- alt=chat        (one alternative; add landscape for that format)
//        npm run showreel -- vertical 2.5 7  (just write stills at those times to showreel/stills/)
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import './variants.js'

const DIR = import.meta.dirname
const FPS = 60
const B = 60 / 128
const EMOJI = path.join(DIR, 'fonts/emoji.ttf')
const FORMATS = {
  landscape: { width: 1920, height: 1080, query: '', out: 'weneedbananas-showreel.mp4' },
  // 9:16 for Instagram Reels / TikTok / Shorts
  vertical: { width: 1080, height: 1920, query: '&v=1', out: 'weneedbananas-showreel-vertical.mp4' },
}
const EMOJI_URL = 'https://fonts.gstatic.com/s/notocoloremoji/v47/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFab4.ttf'

async function capture(fmt, alt, times, outFor) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--allow-file-access-from-files'],
  })
  const page = await browser.newPage({ viewport: { width: fmt.width, height: fmt.height } })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto('file://' + path.join(DIR, 'reel.html') + '?static=1' + fmt.query + '&alt=' + alt)
  await page.evaluate(() => window.READY)
  for (const t of times) {
    await page.evaluate((t) => window.render(t), t)
    await page.screenshot({ path: outFor(t) })
  }
  await browser.close()
}

// Worker mode: render one slice of frames.
if (process.argv[2] === '--slice') {
  const [, , , name, alt, a, b] = process.argv
  const times = Array.from({ length: b - a }, (_, i) => (Number(a) + i) / FPS)
  await capture(FORMATS[name], alt, times, (t) =>
    path.join(DIR, 'frames', String(Math.round(t * FPS)).padStart(4, '0') + '.png'),
  )
  process.exit(0)
}

if (!fs.existsSync(EMOJI)) {
  console.log('Downloading Noto Color Emoji…')
  fs.writeFileSync(EMOJI, Buffer.from(await (await fetch(EMOJI_URL)).arrayBuffer()))
}

const args = process.argv.slice(2)
const names = args.filter((a) => a in FORMATS)
let alts = args.filter((a) => a.startsWith('alt=')).map((a) => a.slice(4))
if (args.includes('alts')) alts = Object.keys(VARIANTS).filter((a) => a !== 'main')
const formats = names.length ? names : alts.length ? ['vertical'] : Object.keys(FORMATS)
if (!alts.length) alts = ['main']
const stills = args.filter((a) => /^[\d.]+$/.test(a)).map(Number)
if (stills.length) {
  fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true })
  for (const alt of alts)
    for (const name of formats)
      await capture(FORMATS[name], alt, stills, (t) => path.join(DIR, 'stills', `${alt}-${name}-t${t}.png`))
  console.log(`Wrote ${stills.length} stills to showreel/stills/`)
  process.exit(0)
}

for (const alt of alts) {
  console.log(`Synthesising ${alt} soundtrack…`)
  execFileSync('node', [path.join(DIR, 'synth.mjs'), alt], { stdio: 'inherit' })
  for (const name of formats) await renderFormat(name, alt)
}

function outPath(name, alt) {
  if (alt === 'main') return FORMATS[name].out
  return `alternatives/weneedbananas-reel-${alt}${name === 'vertical' ? '' : '-landscape'}.mp4`
}

async function renderFormat(name, alt) {
  const FRAMES = Math.round((VARIANTS[alt].beats || 32) * B * FPS)
  console.log(`Rendering ${FRAMES} ${alt} ${name} frames…`)
  fs.rmSync(path.join(DIR, 'frames'), { recursive: true, force: true })
  fs.mkdirSync(path.join(DIR, 'frames'))
  const workers = Math.max(1, Math.min(6, os.cpus().length))
  const per = Math.ceil(FRAMES / workers)
  await Promise.all(
    Array.from({ length: workers }, (_, i) => {
      const args = [import.meta.filename, '--slice', name, alt, i * per, Math.min(FRAMES, (i + 1) * per)].map(String)
      return new Promise((ok, fail) =>
        spawn('node', args, { stdio: 'inherit' }).on('exit', (c) => (c ? fail(new Error(`worker ${i}`)) : ok())),
      )
    }),
  )

  console.log('Encoding…')
  execFileSync(
    'ffmpeg',
    [
      ...['-loglevel', 'error', '-y', '-framerate', FPS, '-i', path.join(DIR, 'frames/%04d.png')],
      ...['-i', path.join(DIR, `music-${alt}.wav`), '-c:v', 'libx264', '-preset', 'slow'],
      // The alternatives are encoded a little lighter to keep the repo smaller.
      ...['-crf', alt === 'main' ? '16' : '19'],
      ...['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest'],
      path.join(DIR, outPath(name, alt)),
    ].map(String),
    { stdio: 'inherit' },
  )
  console.log(`Done: showreel/${outPath(name, alt)}`)
}
