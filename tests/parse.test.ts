import { describe, expect, it } from 'vitest'
import { formatQty, itemKey, parseItem, parseMany } from '../src/lib/parse'

describe('parseItem', () => {
  it.each([
    ['milk', { name: 'milk', qty: null, unit: null, note: null }],
    ['6 eggs', { name: 'eggs', qty: 6, unit: null, note: null }],
    ['6x eggs', { name: 'eggs', qty: 6, unit: null, note: null }],
    ['6 x eggs', { name: 'eggs', qty: 6, unit: null, note: null }],
    ['500g mince', { name: 'mince', qty: 500, unit: 'g', note: null }],
    ['1.5 kg potatoes', { name: 'potatoes', qty: 1.5, unit: 'kg', note: null }],
    ['3 tins of chopped tomatoes', { name: 'chopped tomatoes', qty: 3, unit: 'tin', note: null }],
    ['bananas x6', { name: 'bananas', qty: 6, unit: null, note: null }],
    ['mince 500g', { name: 'mince', qty: 500, unit: 'g', note: null }],
    ['eggs (free range)', { name: 'eggs', qty: null, unit: null, note: 'free range' }],
    ['bread - seeded', { name: 'bread', qty: null, unit: null, note: 'seeded' }],
    ['2 pints milk (semi skimmed)', { name: 'milk', qty: 2, unit: 'pint', note: 'semi skimmed' }],
    ['lemons', { name: 'lemons', qty: null, unit: null, note: null }],
  ])('%s', (input, expected) => {
    expect(parseItem(input)).toEqual(expected)
  })

  it('ignores blank input', () => {
    expect(parseItem('   ')).toBeNull()
  })
})

describe('parseMany', () => {
  it('splits on commas and newlines, keeping bracketed commas together', () => {
    const items = parseMany('2 onions, garlic\n- 400g chopped tomatoes\n• cheese (cheddar, mature)')
    expect(items.map((i) => i.name)).toEqual(['onions', 'garlic', 'chopped tomatoes', 'cheese'])
    expect(items[3].note).toBe('cheddar, mature')
  })
})

describe('itemKey', () => {
  it('normalises plurals and case', () => {
    expect(itemKey('Bananas')).toBe(itemKey('banana'))
    expect(itemKey('Tomatoes')).toBe('tomato')
    expect(itemKey('Cherries')).toBe('cherry')
    expect(itemKey('glass')).toBe('glass')
  })
})

describe('formatQty', () => {
  it('formats units', () => {
    expect(formatQty(500, 'g')).toBe('500g')
    expect(formatQty(3, 'tin')).toBe('3 tins')
    expect(formatQty(1, 'loaf')).toBe('1 loaf')
    expect(formatQty(2, 'loaf')).toBe('2 loaves')
    expect(formatQty(2, null)).toBe('2')
    expect(formatQty(null, null)).toBe('')
  })
})
