import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import {
  addItems,
  allItems,
  createListDoc,
  finishShop,
  getAisleOrder,
  isMoved,
  moveOut,
  setAisle,
  setAisleOrder,
  setDone,
  usuals,
} from '../src/lib/doc'
import { moveList, storeName } from '../src/lib/move'
import { parseMany } from '../src/lib/parse'
import { isValidSlug } from '../src/lib/slug'

const add = (ld: ReturnType<typeof createListDoc>, text: string) => addItems(ld, parseMany(text))

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)))
}

function listWithHistory() {
  const ld = createListDoc()
  for (let i = 0; i < 2; i++) {
    add(ld, 'milk, bread')
    allItems(ld).forEach((it) => setDone(ld, it.id, true))
    finishShop(ld)
  }
  add(ld, 'halloumi, 6 eggs')
  setAisle(ld, allItems(ld).find((i) => i.key === 'halloumi')!.id, 'meat')
  const order = getAisleOrder(ld)
  setAisleOrder(ld, [order[1], order[0], ...order.slice(2)])
  return ld
}

describe('moving a list to new words', () => {
  it('copies items, usuals and aisle order to the new list', () => {
    const old = listWithHistory()
    const order = getAisleOrder(old)
    const fresh = createListDoc()
    Y.applyUpdate(fresh.doc, moveOut(old))

    expect(
      allItems(fresh)
        .map((i) => `${i.name}:${i.aisle}`)
        .sort(),
    ).toEqual(['eggs:dairy', 'halloumi:meat'])
    expect(usuals(fresh).map((u) => u.name)).toEqual(['milk', 'bread'])
    expect(getAisleOrder(fresh)).toEqual(order)
    expect(isMoved(fresh)).toBe(false)
  })

  it('empties the old list and marks it moved without saying where', () => {
    const old = listWithHistory()
    expect(isMoved(old)).toBe(false)
    moveOut(old)
    expect(isMoved(old)).toBe(true)
    expect(typeof old.meta.get('movedAt')).toBe('number')
    expect(allItems(old)).toHaveLength(0)
    expect(usuals(old)).toHaveLength(0)
    expect(old.aisleFor.size).toBe(0)
    // Undo can't put the items back under the old words.
    old.undo.undo()
    expect(allItems(old)).toHaveLength(0)
  })

  it('reaches other devices on the old words, which never learn the new ones', () => {
    const a = listWithHistory()
    const b = createListDoc()
    sync(a.doc, b.doc)
    expect(allItems(b)).toHaveLength(2)

    moveOut(a)
    sync(a.doc, b.doc)
    expect(isMoved(b)).toBe(true)
    expect(allItems(b)).toHaveLength(0)
    // Nothing in the old list's state points anywhere new.
    const json = JSON.stringify(b.doc.toJSON())
    expect(Object.keys(b.meta.toJSON()).sort()).toEqual(['aisleOrder', 'moved', 'movedAt'])
    expect(json).not.toMatch(/[a-z]+\.[a-z]+\.[a-z]+/)
  })

  it('stores the new list on this device before emptying the old one', async () => {
    const old = listWithHistory()
    const slug = 'lemon.fork.bulb'
    const next = await moveList(old, slug)
    expect(isValidSlug(next)).toBe(true)
    expect(next).not.toBe(slug)
    expect(isMoved(old)).toBe(true)

    // Opening the new words finds the list already there.
    const opened = createListDoc()
    const idb = new IndexeddbPersistence(storeName(next), opened.doc)
    await idb.whenSynced
    await idb.destroy()
    expect(
      allItems(opened)
        .map((i) => i.name)
        .sort(),
    ).toEqual(['eggs', 'halloumi'])
    expect(usuals(opened)).toHaveLength(2)
    expect(isMoved(opened)).toBe(false)
  })

  it('the new list is independent of the old one', () => {
    const old = listWithHistory()
    const fresh = createListDoc()
    Y.applyUpdate(fresh.doc, moveOut(old))
    add(fresh, 'toothpaste')
    add(old, 'crisps')
    expect(allItems(fresh).map((i) => i.name)).not.toContain('crisps')
    expect(allItems(old).map((i) => i.name)).toEqual(['crisps'])
  })
})
