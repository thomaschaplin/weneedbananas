// Renders showreel/reel.html frame by frame, synthesises the soundtrack and encodes the MP4.
// Usage: npm run showreel          (full render, ~3 min)
//        npm run showreel -- 2.5 7  (just write stills at those times to showreel/stills/)
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

const DIR = import.meta.dirname
const FPS = 60
const FRAMES = 15 * FPS
const EMOJI = path.join(DIR, 'fonts/emoji.ttf')
const EMOJI_URL = 'https://fonts.gstatic.com/s/notocoloremoji/v47/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFab4.ttf'

async function capture(times, outFor) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--allow-file-access-from-files'],
  })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto('file://' + path.join(DIR, 'reel.html') + '?static=1')
  await page.evaluate(() => window.READY)
  for (const t of times) {
    await page.evaluate((t) => window.render(t), t)
    await page.screenshot({ path: outFor(t) })
  }
  await browser.close()
}

// Worker mode: render one slice of frames.
if (process.argv[2] === '--slice') {
  const [a, b] = process.argv.slice(3).map(Number)
  const times = Array.from({ length: b - a }, (_, i) => (a + i) / FPS)
  await capture(times, (t) => path.join(DIR, 'frames', String(Math.round(t * FPS)).padStart(4, '0') + '.png'))
  process.exit(0)
}

if (!fs.existsSync(EMOJI)) {
  console.log('Downloading Noto Color Emoji…')
  fs.writeFileSync(EMOJI, Buffer.from(await (await fetch(EMOJI_URL)).arrayBuffer()))
}

const stills = process.argv.slice(2).map(Number)
if (stills.length) {
  fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true })
  await capture(stills, (t) => path.join(DIR, 'stills', `t${t}.png`))
  console.log(`Wrote ${stills.length} stills to showreel/stills/`)
  process.exit(0)
}

console.log('Synthesising soundtrack…')
execFileSync('node', [path.join(DIR, 'synth.mjs')], { stdio: 'inherit' })

console.log(`Rendering ${FRAMES} frames…`)
fs.rmSync(path.join(DIR, 'frames'), { recursive: true, force: true })
fs.mkdirSync(path.join(DIR, 'frames'))
const workers = Math.max(1, Math.min(6, os.cpus().length))
const per = Math.ceil(FRAMES / workers)
await Promise.all(
  Array.from({ length: workers }, (_, i) => {
    const args = [import.meta.filename, '--slice', i * per, Math.min(FRAMES, (i + 1) * per)].map(String)
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
    ...['-i', path.join(DIR, 'music.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16'],
    ...['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '256k', '-shortest'],
    path.join(DIR, 'weneedbananas-showreel.mp4'),
  ].map(String),
  { stdio: 'inherit' },
)
console.log('Done: showreel/weneedbananas-showreel.mp4')
