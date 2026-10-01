import fs from 'fs'
const SR = 44100,
  DUR = 15,
  N = SR * DUR,
  B = 60 / 128
const L = new Float32Array(N),
  R = new Float32Array(N),
  VL = new Float32Array(N),
  VR = new Float32Array(N) // dry + reverb send
let seed = 3
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
const add = (t0, dur, fn, { gain = 1, pan = 0, send = 0 } = {}) => {
  const a = Math.floor(t0 * SR),
    n = Math.floor(dur * SR)
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * 1.414,
    gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * 1.414
  for (let i = 0; i < n; i++) {
    const j = a + i
    if (j < 0 || j >= N) continue
    const v = fn(i / SR, i)
    L[j] += v * gl
    R[j] += v * gr
    VL[j] += v * gl * send
    VR[j] += v * gr * send
  }
}
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5))
const tri = (ph) => 1 - 4 * Math.abs(ph - Math.floor(ph + 0.5))
const kickTimes = []

// ---------- drums ----------
function kick(t, g = 1) {
  kickTimes.push(t)
  let ph = 0
  add(
    t,
    0.5,
    (x) => {
      const f = 45 + 110 * Math.exp(-x * 28)
      ph += f / SR
      return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 7) * 1.1 + (x < 0.004 ? rnd() * 0.4 : 0)
    },
    { gain: g },
  )
}
function clap(t, g = 0.5) {
  let lp = 0,
    hp = 0
  add(
    t,
    0.3,
    (x) => {
      const n = rnd()
      lp += (n - lp) * 0.5
      hp = n - lp
      const env = x < 0.03 ? Math.exp(-((x % 0.01) * 300)) : Math.exp(-(x - 0.03) * 22)
      return hp * env
    },
    { gain: g, send: 0.35 },
  )
}
function hat(t, g = 0.18, open = false) {
  let lp = 0
  add(
    t,
    open ? 0.25 : 0.06,
    (x) => {
      const n = rnd()
      lp += (n - lp) * 0.3
      return (n - lp) * Math.exp(-x * (open ? 14 : 60))
    },
    { gain: g, pan: 0.3 },
  )
}
function impact(t, g = 1) {
  let ph = 0,
    lp = 0
  add(
    t,
    2.2,
    (x) => {
      const f = 32 + 70 * Math.exp(-x * 9)
      ph += f / SR
      const n = rnd()
      lp += (n - lp) * (0.05 + 0.6 * Math.exp(-x * 8))
      return Math.sin(2 * Math.PI * ph) * Math.exp(-x * 2.2) * 0.9 + lp * Math.exp(-x * 4) * 0.9
    },
    { gain: g, send: 0.4 },
  )
}
function whoosh(tc, len = 0.45, g = 0.35, rev = false) {
  let lp = 0,
    bp = 0
  add(
    tc - len,
    len + 0.15,
    (x) => {
      const k = Math.min(1, x / len)
      const c = 0.02 + 0.5 * (rev ? 1 - k : k) ** 2
      const n = rnd()
      lp += (n - lp) * c
      bp += (lp - bp) * c * 0.5
      const env = x < len ? k ** 2 : Math.exp(-(x - len) * 30)
      return (lp - bp) * env * 2
    },
    { gain: g, pan: 0, send: 0.3 },
  )
}
function riser(t0, t1, g = 0.25) {
  let lp = 0
  add(
    t0,
    t1 - t0,
    (x) => {
      const k = x / (t1 - t0)
      const n = rnd()
      lp += (n - lp) * (0.01 + 0.4 * k * k)
      return (n * 0.15 + lp) * k * k
    },
    { gain: g, send: 0.3 },
  )
}

// ---------- tonal ----------
const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
function pluck(t, m, g = 0.18, pan = 0, dec = 9) {
  const f = mtof(m)
  let ph = 0,
    lp = 0
  add(
    t,
    0.6,
    (x) => {
      ph += f / SR
      const v = saw(ph) * 0.6 + Math.sin(2 * Math.PI * ph * 2) * 0.3
      const c = 0.05 + 0.6 * Math.exp(-x * 25)
      lp += (v - lp) * c
      return lp * Math.exp(-x * dec)
    },
    { gain: g, pan, send: 0.45 },
  )
}
function bell(t, m, g = 0.2, dec = 2.5) {
  const f = mtof(m)
  add(
    t,
    3,
    (x) =>
      (Math.sin(2 * Math.PI * f * x) +
        0.5 * Math.sin(2 * Math.PI * f * 2.76 * x) * Math.exp(-x * 4) +
        0.25 * Math.sin(2 * Math.PI * f * 5.4 * x) * Math.exp(-x * 8)) *
      Math.exp(-x * dec) *
      Math.min(1, x * 400),
    { gain: g, send: 0.6 },
  )
}
function pad(t, dur, notes, g = 0.08, cut = 0.06) {
  const phs = notes.flatMap(() => [0, 0, 0])
  let lp = 0,
    lp2 = 0
  add(
    t,
    dur + 0.4,
    (x) => {
      let v = 0
      notes.forEach((m, i) => {
        ;[-0.12, 0, 0.11].forEach((d, k) => {
          const idx = i * 3 + k
          phs[idx] += mtof(m + d) / SR
          v += saw(phs[idx])
        })
      })
      lp += (v - lp) * cut
      lp2 += (lp - lp2) * cut
      const env = Math.min(1, x / 0.05) * (x > dur ? Math.exp(-(x - dur) * 10) : 1)
      return (lp2 * env) / notes.length
    },
    { gain: g, send: 0.5 },
  )
}
function bass(t, dur, m, g = 0.3) {
  let ph = 0,
    lp = 0
  const f = mtof(m)
  add(
    t,
    dur,
    (x) => {
      ph += f / SR
      const v = saw(ph) + Math.sin(2 * Math.PI * ph) * 0.8
      lp += (v - lp) * (0.04 + 0.15 * Math.exp(-x * 12))
      return lp * Math.min(1, x * 300) * Math.min(1, (dur - x) * 200)
    },
    { gain: g },
  )
}

// ---------- arrangement ----------
// F  C  Dm Bb   (I V vi IV), F major
const CH = [
  [65, 69, 72],
  [64, 67, 72],
  [62, 65, 69],
  [62, 65, 70],
]
const ROOT = [41, 36, 38, 34]
const chordAt = (beat) => Math.floor(beat / 4) % 4

// intro: impact + shimmer + riser
impact(0.0, 0.9)
bell(0.02, 77, 0.12)
bell(0.25, 84, 0.08)
pad(0, 4 * B, [65, 69, 72, 77], 0.07, 0.03)
for (let i = 0; i < 16; i++)
  pluck((i * B) / 4 + 0.0, [65, 69, 72, 77, 81, 84][i % 6] + (i > 11 ? 12 : 0), 0.06 + i * 0.006, i % 2 ? 0.4 : -0.4, 7)
riser(1.0, 4 * B, 0.3)
whoosh(4 * B, 0.5, 0.4)

// main groove beats 4..28
for (let b = 4; b < 28; b++) {
  const t = b * B
  kick(t, b === 4 ? 1.2 : 1)
  if (b % 2 === 1) clap(t, 0.45)
  hat(t + B / 2, 0.16, b % 4 === 3)
  const dense = (b >= 16 && b < 20) || (b >= 25 && b < 28)
  if (dense) {
    hat(t + B / 4, 0.08)
    hat(t + (3 * B) / 4, 0.08)
  }
  // bass offbeat 8ths
  const c = chordAt(b - 4)
  bass(t + B / 2, (B / 2) * 0.9, ROOT[c] + 12, 0.22)
  bass(t, B / 4, ROOT[c], 0.12)
  // arp 16ths
  for (let s = 0; s < 4; s++) {
    const notes = CH[c]
    const m = notes[(b * 4 + s) % 3] + (s === 3 ? 12 : 0)
    pluck(t + (s * B) / 4, m + 12, b >= 10 ? 0.07 : 0.05, s % 2 ? 0.5 : -0.5, 12)
  }
}
for (let bar = 1; bar < 7; bar++) {
  const c = (bar - 1) % 4
  pad(bar * 4 * B, 4 * B, CH[c], 0.06, 0.05)
}
// word slams
;[5, 6, 7].forEach((b, i) => {
  impact(b * B, 0.45)
  bell(b * B, [77, 81, 84][i], 0.1, 4)
})
// typing ticks
for (let i = 0; i < 33; i++) {
  const t = 8 * B + 0.02 + i * (0.4 / 33)
  let lp = 0
  add(
    t,
    0.02,
    (x) => {
      const n = rnd()
      lp += (n - lp) * 0.5
      return (n - lp) * Math.exp(-x * 300)
    },
    { gain: 0.12, pan: i % 2 ? 0.3 : -0.3 },
  )
}
// transitions
whoosh(10 * B, 0.4, 0.38)
whoosh(16 * B, 0.35, 0.45)
whoosh(20 * B, 0.35, 0.35, true)
whoosh(25 * B, 0.3, 0.4)
// S3 chip landings (pentatonic up)
const PENT = [65, 67, 69, 72, 74, 77, 79, 81]
for (let k = 0; k < 8; k++) pluck(10 * B + 1.0 + k * 0.045 + 0.42, PENT[k] + 12, 0.11, (k / 7) * 1.4 - 0.7, 14)
for (let k = 0; k < 8; k++) {
  let lp = 0
  add(
    10 * B + 0.25 + k * 0.055 + 0.15,
    0.05,
    (x) => {
      const n = rnd()
      lp += (n - lp) * 0.2
      return lp * Math.exp(-x * 90)
    },
    { gain: 0.3 },
  )
}
// S4 merge
impact(18 * B, 0.9)
bell(18 * B, 84, 0.18, 2)
bell(18 * B + 0.06, 89, 0.12, 2.5)
// S5 stamp + packets
impact(21 * B + 0.04, 0.7)
for (let i = 0; i < 7; i++) {
  const at = 20 * B + 0.65 + i * 0.2 + 0.55
  if (i !== 3 && i !== 6) pluck(at, [77, 81, 84, 89][Math.min(3, [0, 1, 2, 4, 5].indexOf(i))] + 0, 0.1, 0.6, 16)
}
// S6 ticks
for (let i = 0; i < 7; i++) pluck(25 * B + 0.42 + i * 0.12, [72, 74, 77, 79, 81, 84, 86][i], 0.13, 0.3, 11)
bell(25 * B + 1.25, 89, 0.15, 2)
bell(25 * B + 1.3, 93, 0.1, 2)
// S7 stat slams + finale
;[28, 28.5, 29].forEach((b, i) => {
  kick(b * B, 1.2)
  impact(b * B, 0.5)
  clap(b * B, 0.4)
  bell(b * B, [72, 74, 77][i], 0.12, 5)
})
riser(29 * B, 29.5 * B, 0.3)
kick(29.5 * B, 1.3)
impact(29.5 * B, 1.0)
pad(29.5 * B, 15 - 29.5 * B - 0.25, [53, 65, 69, 72, 77, 81], 0.11, 0.05)
bass(29.5 * B, 15 - 29.5 * B - 0.2, 29, 0.3)
;[77, 81, 84, 89, 93].forEach((m, i) => bell(29.5 * B + i * 0.07, m, 0.09, 1.5))
for (let i = 0; i < 12; i++)
  pluck(
    29.5 * B + 0.4 + (i * B) / 4,
    [89, 84, 81, 77][i % 4] + (i > 7 ? -12 : 0),
    0.06 * (1 - i / 14),
    i % 2 ? 0.6 : -0.6,
    8,
  )

// ---------- sidechain on music bus (approx: duck everything except kicks by envelope) ----------
// (applied to reverb only, keeps it tidy)
kickTimes.sort((a, b) => a - b)
// ---------- reverb (Schroeder) ----------
function reverb(inp, combs, aps) {
  const out = new Float32Array(N)
  for (const [d, fb] of combs) {
    const buf = new Float32Array(d)
    let p = 0,
      lp = 0
    for (let i = 0; i < N; i++) {
      const y = buf[p]
      lp += (y - lp) * 0.4
      buf[p] = inp[i] + lp * fb
      out[i] += y
      p = (p + 1) % d
    }
  }
  for (const [d, g] of aps) {
    const buf = new Float32Array(d)
    let p = 0
    for (let i = 0; i < N; i++) {
      const b = buf[p]
      const x = out[i]
      const y = -x * g + b
      buf[p] = x + b * g
      out[i] = y
      p = (p + 1) % d
    }
  }
  return out
}
const rvL = reverb(
  VL,
  [
    [1557, 0.84],
    [1617, 0.84],
    [1491, 0.84],
    [1422, 0.84],
  ],
  [
    [225, 0.5],
    [556, 0.5],
  ],
)
const rvR = reverb(
  VR,
  [
    [1580, 0.84],
    [1640, 0.84],
    [1514, 0.84],
    [1445, 0.84],
  ],
  [
    [248, 0.5],
    [579, 0.5],
  ],
)
let ki = 0
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0)
buf.writeUInt32LE(36 + N * 4, 4)
buf.write('WAVEfmt ', 8)
buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1, 20)
buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 4, 28)
buf.writeUInt16LE(4, 32)
buf.writeUInt16LE(16, 34)
buf.write('data', 36)
buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const t = i / SR
  while (ki < kickTimes.length - 1 && kickTimes[ki + 1] <= t) ki++
  const duck = kickTimes[ki] <= t ? 1 - 0.55 * Math.exp(-(t - kickTimes[ki]) * 9) : 1
  const fade = Math.min(1, (DUR - t) / 0.25) * Math.min(1, t / 0.005)
  const l = Math.tanh((L[i] + rvL[i] * 0.22 * duck) * 0.8) * 0.92 * fade
  const r = Math.tanh((R[i] + rvR[i] * 0.22 * duck) * 0.8) * 0.92 * fade
  buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4)
  buf.writeInt16LE(Math.round(r * 32767), 46 + i * 4)
}
fs.writeFileSync(new URL('music.wav', import.meta.url), buf)
console.log('ok')
