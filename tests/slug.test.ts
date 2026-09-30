import { describe, expect, it } from 'vitest'
import { generateSlug, isValidSlug, nearestWord, parseSlugInput, SLUG_RE } from '../src/lib/slug'
import { WORDS } from '../src/lib/words'

describe('words', () => {
  it('are unique, lowercase and URL safe', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length)
    for (const w of WORDS) expect(w).toMatch(/^[a-z]{3,9}$/)
    expect(WORDS.length).toBeGreaterThan(1500)
  })
})

describe('slugs', () => {
  it('generates three known words', () => {
    for (let i = 0; i < 50; i++) {
      const s = generateSlug()
      expect(s).toMatch(SLUG_RE)
      expect(isValidSlug(s)).toBe(true)
    }
  })

  it.each([
    'lemon.fork.bulb',
    'Lemon Fork Bulb',
    '  lemon-fork-bulb ',
    'lemon, fork, bulb',
    'https://weneedbananas.com/lemon.fork.bulb',
    'weneedbananas.com/Lemon.Fork.Bulb?x=1',
  ])('normalises %s', (input) => {
    expect(parseSlugInput(input)).toEqual({ ok: true, slug: 'lemon.fork.bulb' })
  })

  it('suggests fixes for typos', () => {
    const r = parseSlugInput('lemom.fork.bulb')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.suggestions).toEqual(['lemon', 'fork', 'bulb'])
    expect(nearestWord('qqqqqqq')).toBeNull()
  })

  it('rejects the wrong number of words', () => {
    expect(parseSlugInput('lemon.fork')).toMatchObject({ ok: false, reason: 'count' })
  })
})
