import { describe, expect, it } from 'vitest'
import { DEFAULT_ORDER } from '../src/lib/aisles'
import type { Item } from '../src/lib/doc'
import { listAsText, sharedText, toAddBarText } from '../src/lib/export'
import { parseMany } from '../src/lib/parse'

let n = 0
function item(p: Partial<Item> & Pick<Item, 'name' | 'aisle'>): Item {
  n++
  return {
    id: `i${n}`,
    key: p.name,
    qty: null,
    unit: null,
    note: null,
    done: false,
    missing: false,
    addedAt: n,
    doneAt: null,
    ...p,
  }
}

describe('listAsText', () => {
  const items = [
    item({ name: 'mince', aisle: 'meat', qty: 500, unit: 'g' }),
    item({ name: 'bananas', aisle: 'produce', qty: 6 }),
    item({ name: 'milk', aisle: 'dairy', qty: 2, unit: 'pint', note: 'semi-skimmed' }),
    item({ name: 'bread', aisle: 'bakery', done: true, doneAt: 5 }),
    item({ name: 'lemons', aisle: 'produce' }),
  ]

  it('groups un-ticked items by aisle in walking order, with quantities and notes', () => {
    expect(listAsText('lemon.fork.bulb', items, DEFAULT_ORDER)).toBe(
      [
        'Shopping list (lemon.fork.bulb)',
        '',
        '🥦 Fruit & veg',
        '- 6 bananas',
        '- lemons',
        '',
        '🥩 Meat & fish',
        '- 500g mince',
        '',
        '🧀 Dairy, eggs & chilled',
        '- 2 pints milk (semi-skimmed)',
      ].join('\n'),
    )
  })

  it("follows the list's own aisle order", () => {
    const order = ['dairy', ...DEFAULT_ORDER.filter((a) => a !== 'dairy')]
    const text = listAsText('lemon.fork.bulb', items, order)
    expect(text.indexOf('Dairy')).toBeLessThan(text.indexOf('Fruit & veg'))
  })

  it('adds the link at the bottom when given', () => {
    const text = listAsText('lemon.fork.bulb', items, DEFAULT_ORDER, 'https://weneedbananas.com/lemon.fork.bulb')
    expect(text.endsWith('\n\nShared list: https://weneedbananas.com/lemon.fork.bulb')).toBe(true)
  })

  it('says so when everything is ticked', () => {
    expect(listAsText('a.b.c', [items[3]], DEFAULT_ORDER)).toBe('Shopping list (a.b.c)\n\nNothing left to get.')
  })
})

describe('shared text', () => {
  it('keeps the text lines and drops bare links', () => {
    expect(sharedText('Pancakes', '  100g flour\n\n2 eggs\r\nhttps://example.com/pancakes\n300ml milk ')).toBe(
      '100g flour\n2 eggs\n300ml milk',
    )
  })

  it('falls back to the title when there is no text', () => {
    expect(sharedText('bananas', null)).toBe('bananas')
    expect(sharedText(null, '')).toBe('')
  })

  it('becomes one add-bar line that parses back into the same items', () => {
    const line = toAddBarText('100g flour\n2 eggs,\n1 onion (finely chopped)')
    expect(line).toBe('100g flour, 2 eggs, 1 onion (finely chopped)')
    expect(parseMany(line).map((p) => p.name)).toEqual(['flour', 'eggs', 'onion'])
  })
})
