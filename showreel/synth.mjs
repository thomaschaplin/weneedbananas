// Synthesises the soundtrack for one edit of the reel: node synth.mjs [main|chat|midnight|…] -> music-<alt>.wav
import fs from 'fs'
import './variants.js'
const ALT = process.argv[2] || 'main'
const VAR = globalThis.VARIANTS[ALT]
const B = 60 / 128,
  SR = 44100,
  DUR = (VAR.beats || 32) * B,
  N = Math.round(SR * DUR)
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
// Events written in master-reel time play wherever the edit (VAR.segs) uses that moment.
const at = (tm, fn) => {
  for (const [ns, src, len] of VAR.segs)
    if (typeof src === 'number' && tm >= src * B - 1e-6 && tm < (src + len) * B) fn(ns * B + tm - src * B)
}
const [G0, G1] = VAR.groove

// F C Dm Bb (I V vi IV) in F major; midnight flips it to Dm Bb F C.
const MAJ = [
  [65, 69, 72],
  [64, 67, 72],
  [62, 65, 69],
  [62, 65, 70],
]
const CH = VAR.minor ? [MAJ[2], MAJ[3], MAJ[0], MAJ[1]] : MAJ
const ROOT = VAR.minor ? [38, 34, 41, 36] : [41, 36, 38, 34]
const LIFT = VAR.minor ? 0 : 12 // arp octave
const chordAt = (beat) => ((Math.floor(beat / 4) % 4) + 4) % 4

// intro, up to the first downbeat of the groove
if (ALT === 'chat') {
  pad(0, G0 * B, [53, 60, 65], 0.04, 0.03)
  const CHAT = [0.05, 0.22, 0.36, 0.5, 0.62, 0.73, 0.84, 0.94, 1.03, 1.11]
  CHAT.forEach((t, i) => {
    pluck(t, [84, 88, 81, 89, 84, 86, 88, 81, 79, 77][i], 0.1, i % 2 ? 0.4 : -0.4, 20)
    pluck(t, [96, 100, 93, 101, 96, 98, 100, 93, 91, 89][i], 0.04, 0, 30)
  })
  impact(1.22, 0.8)
  bell(1.22, 77, 0.12, 3)
  riser(1.3, G0 * B, 0.32)
} else if (G0 > 0) {
  impact(0.0, 0.9)
  bell(0.02, 77, 0.12)
  bell(0.25, 84, 0.08)
  pad(0, G0 * B, CH[0].concat(CH[0][0] + 12), 0.07, 0.03)
  for (let i = 0; i < G0 * 4; i++)
    pluck(
      (i * B) / 4,
      [65, 69, 72, 77, 81, 84][i % 6] + (i > 11 ? 12 : 0) - (VAR.minor ? 3 : 0),
      0.06 + i * 0.006,
      i % 2 ? 0.4 : -0.4,
      7,
    )
  riser(Math.max(0, G0 * B - 0.9), G0 * B, 0.3)
} else impact(0.0, 0.9)
if (G0 > 0) whoosh(G0 * B, 0.5, 0.4)

// groove
for (let b = G0; b < G1; b++) {
  const t = b * B
  kick(t, b === G0 ? 1.2 : 1)
  if ((b - G0) % 2 === 1) clap(t, 0.45)
  hat(t + B / 2, 0.16, (b - G0) % 4 === 3)
  const c = chordAt(b - G0)
  if (b - G0 >= 12 || VAR.minor) {
    hat(t + B / 4, 0.07)
    hat(t + (3 * B) / 4, 0.07)
  }
  bass(t + B / 2, (B / 2) * 0.9, ROOT[c] + 12, 0.22)
  bass(t, B / 4, ROOT[c], 0.12)
  for (let s = 0; s < 4; s++) {
    const m = CH[c][(b * 4 + s) % 3] + (s === 3 ? 12 : 0)
    pluck(t + (s * B) / 4, m + LIFT, b - G0 >= 6 ? 0.07 : 0.05, s % 2 ? 0.5 : -0.5, VAR.minor ? 8 : 12)
  }
}
for (let b = G0; b < G1; b += 4) pad(b * B, Math.min(4, G1 - b) * B, CH[chordAt(b - G0)], 0.06, VAR.minor ? 0.03 : 0.05)

// a hit on every cut between non-adjacent moments
VAR.segs.forEach(([ns, src], i) => {
  const prev = VAR.segs[i - 1]
  if (!prev || ns === G0) return
  if (typeof prev[1] === 'number' && typeof src === 'number' && Math.abs(prev[1] + prev[2] - src) < 1e-6) return
  whoosh(ns * B, 0.3, 0.32)
  impact(ns * B, 0.35)
})

// kinetic type: a chord stab on every word
if (ALT === 'type')
  for (const card of globalThis.TYPE_CARDS)
    for (const it of card.items) {
      const t = (it.at ?? card.b) * B
      const c = CH[chordAt(Math.floor(it.at ?? card.b))]
      c.forEach((m, i) => pluck(t, m + 12, 0.07, i - 1, 10))
      if (card.mess && !it.at) impact(t, 0.6)
    }

// master-reel moments
;[5, 6, 7].forEach((b, i) =>
  at(b * B, (t) => {
    impact(t, 0.45)
    bell(t, [77, 81, 84][i], 0.1, 4)
  }),
)
for (let i = 0; i < 33; i++)
  at(8 * B + 0.02 + i * (0.4 / 33), (t) => {
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
  })
at(10 * B - 0.001, (t) => whoosh(t, 0.4, 0.38))
at(16 * B - 0.001, (t) => whoosh(t, 0.35, 0.45))
at(20 * B - 0.001, (t) => whoosh(t, 0.35, 0.35, true))
at(25 * B - 0.001, (t) => whoosh(t, 0.3, 0.4))
const PENT = [65, 67, 69, 72, 74, 77, 79, 81]
for (let k = 0; k < 8; k++) {
  at(10 * B + 1.0 + k * 0.045 + 0.42, (t) => pluck(t, PENT[k] + 12, 0.11, (k / 7) * 1.4 - 0.7, 14))
  at(10 * B + 0.25 + k * 0.055 + 0.15, (t) => {
    let lp = 0
    add(
      t,
      0.05,
      (x) => {
        const n = rnd()
        lp += (n - lp) * 0.2
        return lp * Math.exp(-x * 90)
      },
      { gain: 0.3 },
    )
  })
}
at(18 * B, (t) => {
  impact(t, 0.9)
  bell(t, 84, 0.18, 2)
  bell(t + 0.06, 89, 0.12, 2.5)
})
at(21 * B + 0.04, (t) => impact(t, 0.7))
;[0, 1, 2, 4, 5].forEach((i, n) =>
  at(20 * B + 0.65 + i * 0.2 + 0.55, (t) => pluck(t, [77, 81, 84, 89, 89][n], 0.1, 0.6, 16)),
)
for (let i = 0; i < 7; i++)
  at(25 * B + 0.42 + i * 0.12, (t) => pluck(t, [72, 74, 77, 79, 81, 84, 86][i], 0.13, 0.3, 11))
at(25 * B + 1.25, (t) => {
  bell(t, 89, 0.15, 2)
  bell(t + 0.05, 93, 0.1, 2)
})
;[28, 28.5, 29].forEach((b, i) =>
  at(b * B, (t) => {
    kick(t, 1.2)
    impact(t, 0.5)
    clap(t, 0.4)
    bell(t, [72, 74, 77][i], 0.12, 5)
  }),
)
at(29 * B, (t) => riser(t, t + 0.5 * B, 0.3))
// finale: the end card lands
at(29.5 * B, (t) => {
  const hold = DUR - t - 0.25
  kick(t, 1.3)
  impact(t, 1.0)
  pad(t, hold, VAR.minor ? [50, 62, 65, 69, 74, 77] : [53, 65, 69, 72, 77, 81], 0.11, 0.05)
  bass(t, hold + 0.05, VAR.minor ? 26 : 29, 0.3)
  ;(VAR.minor ? [74, 77, 81, 86, 89] : [77, 81, 84, 89, 93]).forEach((m, i) => bell(t + i * 0.07, m, 0.09, 1.5))
  for (let i = 0; i < 12 && t + 0.4 + (i * B) / 4 < DUR - 0.3; i++)
    pluck(
      t + 0.4 + (i * B) / 4,
      [89, 84, 81, 77][i % 4] + (i > 7 ? -12 : 0),
      0.06 * (1 - i / 14),
      i % 2 ? 0.6 : -0.6,
      8,
    )
})

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
fs.writeFileSync(new URL(`music-${ALT}.wav`, import.meta.url), buf)
console.log('ok')
