import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  addItems,
  allItems,
  createListDoc,
  finishShop,
  groupByAisle,
  getAisleOrder,
  setAisle,
  setDone,
  setMissing,
  usuals,
} from '../src/lib/doc'
import { parseMany } from '../src/lib/parse'

const add = (ld: ReturnType<typeof createListDoc>, text: string) => addItems(ld, parseMany(text))

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)))
}

describe('list document', () => {
  it('adds items into aisles and merges duplicates', () => {
    const ld = createListDoc()
    add(ld, 'milk, bananas, 2 milk')
    const items = allItems(ld)
    expect(items).toHaveLength(2)
    expect(items.find((i) => i.key === 'milk')).toMatchObject({ qty: 3, aisle: 'dairy' })
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
})
