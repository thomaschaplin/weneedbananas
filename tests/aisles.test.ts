import { describe, expect, it } from 'vitest'
import { categorise } from '../src/lib/aisles'

describe('categorise', () => {
  it.each([
    ['Bananas', 'produce'],
    ['spring onions', 'produce'],
    ['sourdough', 'bakery'],
    ['chicken thighs', 'meat'],
    ['semi skimmed milk', 'dairy'],
    ['eggs', 'dairy'],
    ['ice cream', 'frozen'],
    ['peanut butter', 'cupboard'],
    ['chopped tomatoes', 'cupboard'],
    ['tomatoes', 'produce'],
    ['coconut milk', 'cupboard'],
    ['orange juice', 'dairy'],
    ['red wine', 'drinks'],
    ['toilet roll', 'household'],
    ['washing up liquid', 'household'],
    ['toothpaste', 'health'],
    ['cat food', 'baby'],
    ['nappies', 'baby'],
    ['garam masala', 'world'],
    ['chocolate', 'snacks'],
    ['corn on the cob', 'produce'],
    ['birthday card', 'other'],
  ])('%s → %s', (name, aisle) => {
    expect(categorise(name)).toBe(aisle)
  })
})
