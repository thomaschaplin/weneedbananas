import { WORDS, WORD_SET } from './words'

export const SLUG_RE = /^[a-z]+\.[a-z]+\.[a-z]+$/

function randomIndex(max: number): number {
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

export function generateSlug(): string {
  return [0, 1, 2].map(() => WORDS[randomIndex(WORDS.length)]).join('.')
}

/** Split whatever the user typed or pasted into lowercase word candidates. */
export function splitInput(input: string): string[] {
  let s = input.trim().toLowerCase()
  // Accept a pasted URL: keep only the last path segment.
  const url = s.match(/^(?:https?:\/\/)?[^/\s]*weneedbananas[^/\s]*\/([^?#\s]*)/)
  if (url) s = url[1]
  return s.split(/[^a-z]+/).filter(Boolean)
}

export type ParsedSlug =
  | { ok: true; slug: string }
  | { ok: false; reason: 'count' | 'unknown'; words: string[]; suggestions: (string | null)[] }

export function parseSlugInput(input: string): ParsedSlug {
  const words = splitInput(input)
  if (words.length !== 3) return { ok: false, reason: 'count', words, suggestions: [] }
  if (words.every((w) => WORD_SET.has(w))) return { ok: true, slug: words.join('.') }
  return {
    ok: false,
    reason: 'unknown',
    words,
    suggestions: words.map((w) => (WORD_SET.has(w) ? w : nearestWord(w))),
  }
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.split('.').every((w) => WORD_SET.has(w))
}

export function nearestWord(word: string): string | null {
  let best: string | null = null
  let bestD = Infinity
  for (const w of WORDS) {
    if (Math.abs(w.length - word.length) > 2) continue
    const d = levenshtein(word, w)
    if (d < bestD) {
      bestD = d
      best = w
    }
  }
  return bestD <= 2 ? best : null
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}
