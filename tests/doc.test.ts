import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  addItems,
  allItems,
  clearAll,
  createListDoc,
  finishShop,
  forgetUsual,
  groupByAisle,
  getAisleOrder,
  HISTORY_CAP,
  pruneHistory,
  removeItem,
  setAisle,
  setAisleOrder,
  setDone,
  setMissing,
  usuals,
} from '../src/lib/doc'
import { DEFAULT_ORDER } from '../src/lib/aisles'
import { parseMany } from '../src/lib/parse'

const add = (ld: ReturnType<typeof createListDoc>, text: string) => addItems(ld, parseMany(text))

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)))
}

describe('list document', () => {
  it('adds items into aisles and merges duplicates', () => {
    const ld = createListDoc()
    add(ld, '6 eggs, bananas, 6 eggs')
    const items = allItems(ld)
    expect(items).toHaveLength(2)
    expect(items.find((i) => i.key === 'egg')).toMatchObject({ qty: 12, aisle: 'dairy' })
    expect(items.find((i) => i.key === 'banana')?.aisle).toBe('produce')
  })

  it('re-adding a ticked item brings it back', () => {
    const ld = createListDoc()
    add(ld, 'bread')
    const [bread] = allItems(ld)
    setDone(ld, bread.id, true)
    add(ld, 'bread')
    expect(allItems(ld)[0]).toMatchObject({ done: false, qty: null })
  })

  it('groups in aisle order with ticked items last', () => {
    const ld = createListDoc()
    add(ld, 'milk, bread, apples, pears')
    const apples = allItems(ld).find((i) => i.key === 'apple')!
    setDone(ld, apples.id, true)
    const groups = groupByAisle(allItems(ld), getAisleOrder(ld))
    expect(groups.map((g) => g.aisle)).toEqual(['produce', 'bakery', 'dairy'])
    expect(groups[0].todo.map((i) => i.name)).toEqual(['pears'])
    expect(groups[0].done.map((i) => i.name)).toEqual(['apples'])
  })

  it('done shopping clears bought items but keeps missing ones', () => {
    const ld = createListDoc()
    add(ld, 'milk, saffron, bread')
    const [milk, saffron] = allItems(ld)
    setDone(ld, milk.id, true)
    setMissing(ld, saffron.id, true)
    expect(finishShop(ld)).toBe(1)
    expect(
      allItems(ld)
        .map((i) => i.name)
        .sort(),
    ).toEqual(['bread', 'saffron'])
    ld.undo.undo()
    expect(allItems(ld)).toHaveLength(3)
  })

  it('remembers aisle overrides for the list', () => {
    const ld = createListDoc()
    add(ld, 'halloumi')
    setAisle(ld, allItems(ld)[0].id, 'meat')
    finishShop(ld)
    setDone(ld, allItems(ld)[0].id, true)
    finishShop(ld)
    add(ld, 'halloumi')
    expect(allItems(ld)[0].aisle).toBe('meat')
  })

  it('suggests usuals that are not already on the list', () => {
    const ld = createListDoc()
    for (let i = 0; i < 3; i++) {
      add(ld, 'milk, bread')
      allItems(ld).forEach((it) => setDone(ld, it.id, true))
      finishShop(ld)
    }
    add(ld, 'milk')
    expect(usuals(ld).map((u) => u.name)).toEqual(['bread'])
  })

  it('merges offline edits from two devices', () => {
    const a = createListDoc()
    const b = createListDoc()
    add(a, 'milk, eggs')
    sync(a.doc, b.doc)

    // Both go offline and edit.
    const milkB = allItems(b).find((i) => i.key === 'milk')!
    setDone(b, milkB.id, true) // B ticks milk in the shop
    add(a, 'bread') // A adds bread at home
    add(b, 'cheese')
    const eggsA = allItems(a).find((i) => i.key === 'egg')!
    setMissing(a, eggsA.id, false)

    sync(a.doc, b.doc)
    const names = (ld: typeof a) =>
      allItems(ld)
        .map((i) => `${i.name}:${i.done}`)
        .sort()
    expect(names(a)).toEqual(names(b))
    expect(names(a)).toEqual(['bread:false', 'cheese:false', 'eggs:false', 'milk:true'])
  })

  it('undo only reverts local edits', () => {
    const a = createListDoc()
    const b = createListDoc()
    add(a, 'milk')
    add(b, 'eggs')
    sync(a.doc, b.doc)
    a.undo.undo()
    expect(allItems(a).map((i) => i.name)).toEqual(['eggs'])
  })

  it('marking an item missing un-ticks it, and finishing the shop keeps it', () => {
    const ld = createListDoc()
    add(ld, 'saffron, milk')
    const saffron = allItems(ld).find((i) => i.key === 'saffron')!
    const milk = allItems(ld).find((i) => i.key === 'milk')!
    setDone(ld, saffron.id, true)
    setDone(ld, milk.id, true)
    setMissing(ld, saffron.id, true)
    expect(allItems(ld).find((i) => i.id === saffron.id)).toMatchObject({ missing: true, done: false, doneAt: null })
    expect(finishShop(ld)).toBe(1)
    expect(allItems(ld)).toEqual([expect.objectContaining({ name: 'saffron', missing: true })])
  })

  it('ticking or re-adding a missing item clears the flag', () => {
    const ld = createListDoc()
    add(ld, 'saffron, capers')
    const [a, b] = allItems(ld)
    setMissing(ld, a.id, true)
    setMissing(ld, b.id, true)
    setDone(ld, a.id, true)
    expect(allItems(ld).find((i) => i.id === a.id)?.missing).toBe(false)
    add(ld, b.name)
    expect(allItems(ld).find((i) => i.id === b.id)?.missing).toBe(false)
    setMissing(ld, b.id, true)
    setMissing(ld, b.id, false)
    expect(allItems(ld).find((i) => i.id === b.id)?.missing).toBe(false)
  })

  it('sorts missing items after the others in their aisle', () => {
    const ld = createListDoc()
    add(ld, 'apples, pears')
    const apples = allItems(ld).find((i) => i.key === 'apple')!
    setMissing(ld, apples.id, true)
    const [produce] = groupByAisle(allItems(ld), getAisleOrder(ld))
    expect(produce.todo.map((i) => i.name)).toEqual(['pears', 'apples'])
  })

  it('remembers an aisle move by item key, so plurals follow it', () => {
    const ld = createListDoc()
    add(ld, 'halloumi, bananas')
    const bananas = allItems(ld).find((i) => i.key === 'banana')!
    setAisle(ld, bananas.id, 'snacks')
    expect(ld.aisleFor.get('banana')).toBe('snacks')
    removeItem(ld, bananas.id)
    add(ld, 'banana')
    expect(allItems(ld).find((i) => i.key === 'banana')?.aisle).toBe('snacks')
    // Other items are untouched.
    expect(allItems(ld).find((i) => i.key === 'halloumi')?.aisle).toBe('dairy')
  })

  it('undoing an aisle move also forgets it', () => {
    const ld = createListDoc()
    add(ld, 'halloumi')
    setAisle(ld, allItems(ld)[0].id, 'meat')
    ld.undo.undo()
    expect(allItems(ld)[0].aisle).toBe('dairy')
    expect(ld.aisleFor.has('halloumi')).toBe(false)
  })

  it('aisle order defaults, saves, and keeps aisles a saved order does not know about', () => {
    const ld = createListDoc()
    expect(getAisleOrder(ld)).toEqual(DEFAULT_ORDER)
    getAisleOrder(ld).push('mutated')
    expect(getAisleOrder(ld)).toEqual(DEFAULT_ORDER)

    // An order saved by an older version that only knew a few aisles, plus one since removed.
    ld.meta.set('aisleOrder', ['dairy', 'retired', 'produce'])
    const order = getAisleOrder(ld)
    expect(order.slice(0, 2)).toEqual(['dairy', 'produce'])
    expect(order).not.toContain('retired')
    expect([...order].sort()).toEqual([...DEFAULT_ORDER].sort())
    expect(order.slice(2)).toEqual(DEFAULT_ORDER.filter((a) => a !== 'dairy' && a !== 'produce'))

    const reversed = [...DEFAULT_ORDER].reverse()
    setAisleOrder(ld, reversed)
    expect(getAisleOrder(ld)).toEqual(reversed)
    add(ld, 'milk, apples')
    expect(groupByAisle(allItems(ld), getAisleOrder(ld)).map((g) => g.aisle)).toEqual(['dairy', 'produce'])
    ld.undo.undo()
    ld.undo.undo()
    expect(getAisleOrder(ld)).toEqual(order)
  })

  it('clearing every item is a single undo step', () => {
    const ld = createListDoc()
    add(ld, 'milk, eggs, bread')
    clearAll(ld)
    expect(allItems(ld)).toHaveLength(0)
    ld.undo.undo()
    expect(allItems(ld)).toHaveLength(3)
    ld.undo.redo()
    expect(allItems(ld)).toHaveLength(0)
  })

  it('merges quantities with matching units and keeps the newest when units differ', () => {
    const ld = createListDoc()
    add(ld, '2 milk')
    add(ld, '1 milk')
    expect(allItems(ld)).toEqual([expect.objectContaining({ qty: 3, unit: null })])
    add(ld, '500g mince')
    add(ld, '1kg mince')
    expect(allItems(ld).find((i) => i.key === 'mince')).toMatchObject({ qty: 1, unit: 'kg' })
  })
})

describe('usuals history', () => {
  const DAY = 24 * 60 * 60 * 1000

  it('forgets a usual and can undo it', () => {
    const ld = createListDoc()
    add(ld, 'mlik')
    add(ld, 'mlik')
    removeItem(ld, allItems(ld)[0].id)
    const [typo] = usuals(ld)
    expect(typo).toMatchObject({ key: 'mlik', count: 2 })
    forgetUsual(ld, typo.key)
    expect(usuals(ld)).toEqual([])
    expect(ld.history.has('mlik')).toBe(false)
    ld.undo.undo()
    expect(usuals(ld).map((u) => u.key)).toEqual(['mlik'])
  })

  it('undoing an add also rolls back its history count', () => {
    const ld = createListDoc()
    add(ld, 'bred')
    ld.undo.undo()
    expect(ld.history.has('bred')).toBe(false)
    expect(allItems(ld)).toEqual([])
  })

  it('drops stale one-off entries but keeps regulars', () => {
    const ld = createListDoc()
    const old = Date.now() - 100 * DAY
    ld.history.set('saffron', { name: 'saffron', count: 1, lastAt: old, unit: null })
    ld.history.set('milk', { name: 'milk', count: 5, lastAt: old, unit: null })
    ld.history.set('tahini', { name: 'tahini', count: 1, lastAt: Date.now() - 10 * DAY, unit: null })
    add(ld, 'bread')
    expect([...ld.history.keys()].sort()).toEqual(['bread', 'milk', 'tahini'])
  })

  it('caps history size, keeping the most used and what was just added', () => {
    const ld = createListDoc()
    const now = Date.now()
    for (let i = 0; i < HISTORY_CAP + 50; i++) {
      ld.history.set(`thing${i}`, { name: `thing${i}`, count: i < 60 ? 2 : 3, lastAt: now - i, unit: null })
    }
    add(ld, 'bananas')
    expect(ld.history.size).toBe(HISTORY_CAP)
    expect(ld.history.has('banana')).toBe(true)
    // 51 were dropped: all from the count-2 entries, oldest first.
    const twos = [...ld.history.keys()].filter((k) => ld.history.get(k)!.count === 2)
    expect(twos.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `thing${i}`).sort())
  })

  it('concurrent prunes and forgets converge', () => {
    const a = createListDoc()
    const b = createListDoc()
    add(a, 'milk, mlik')
    add(a, 'milk, mlik')
    sync(a.doc, b.doc)
    forgetUsual(a, 'mlik')
    add(b, 'mlik')
    pruneHistory(b, Date.now() + 1000 * DAY)
    sync(a.doc, b.doc)
    expect([...a.history.keys()].sort()).toEqual([...b.history.keys()].sort())
  })
})
