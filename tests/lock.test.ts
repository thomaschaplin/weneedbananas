import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { deriveSecrets, type Lock } from '../src/lib/crypto'
import {
  addItems,
  allItems,
  createListDoc,
  finishShop,
  getAisleOrder,
  isRetired,
  lockInfo,
  setAisleOrder,
  setDone,
  usuals,
  type ListDoc,
} from '../src/lib/doc'
import { changePassword, lockKey, removePassword, setPassword, tryPassword } from '../src/lib/lock'
import { storeName } from '../src/lib/move'
import { parseMany } from '../src/lib/parse'

const SLUG = 'lemon.fork.bulb'
const add = (ld: ListDoc, text: string) => addItems(ld, parseMany(text))
const names = (ld: ListDoc) =>
  allItems(ld)
    .map((i) => i.name)
    .sort()

function sync(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a, Y.encodeStateVector(b)))
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b, Y.encodeStateVector(a)))
}

function list() {
  const ld = createListDoc()
  for (let i = 0; i < 2; i++) {
    add(ld, 'milk, bread')
    allItems(ld).forEach((it) => setDone(ld, it.id, true))
    finishShop(ld)
  }
  add(ld, 'halloumi, 6 eggs')
  const order = getAisleOrder(ld)
  setAisleOrder(ld, [order[1], order[0], ...order.slice(2)])
  return ld
}

/** What this device has stored for a password list. */
async function stored(lock: Lock): Promise<ListDoc> {
  const ld = createListDoc()
  const idb = new IndexeddbPersistence(storeName({ slug: SLUG, lock }), ld.doc)
  await idb.whenSynced
  await idb.destroy()
  return ld
}

describe('password lists', () => {
  it('have keys of their own, which depend on the password and the salt', async () => {
    const open = await deriveSecrets(SLUG)
    const a = await deriveSecrets({ slug: SLUG, lock: { password: 'correct horse', salt: '00' } })
    const b = await deriveSecrets({ slug: SLUG, lock: { password: 'correct horsf', salt: '00' } })
    const c = await deriveSecrets({ slug: SLUG, lock: { password: 'correct horse', salt: '01' } })
    const ids = new Set([open.roomId, a.roomId, b.roomId, c.roomId])
    expect(ids.size).toBe(4)
    // Stray spaces don't matter.
    const d = await deriveSecrets({ slug: SLUG, lock: { password: ' correct horse ', salt: '00' } })
    expect(d.roomId).toBe(a.roomId)
  })

  it('adding a password moves everything behind it and leaves only how to check one', async () => {
    const open = list()
    const order = getAisleOrder(open)
    const lock = await setPassword(open, SLUG, 'banana split 99')

    const info = lockInfo(open)!
    expect(info.salt).toBe(lock.salt)
    expect(info.key).toBe(await lockKey(SLUG, lock))
    expect(allItems(open)).toHaveLength(0)
    expect(usuals(open)).toHaveLength(0)
    expect(open.aisleFor.size).toBe(0)
    // Nothing under the words alone gives away the password or the list.
    expect(Object.keys(open.meta.toJSON()).sort()).toEqual(['lockKey', 'lockSalt'])
    expect(JSON.stringify(open.doc.toJSON())).not.toContain('banana split')

    const locked = await stored(lock)
    expect(names(locked)).toEqual(['eggs', 'halloumi'])
    expect(usuals(locked).map((u) => u.name)).toEqual(['milk', 'bread'])
    expect(getAisleOrder(locked)).toEqual(order)
    expect(lockInfo(locked)).toBeNull()
  })

  it('reaches other devices on the words, which then need the password', async () => {
    const a = list()
    const b = createListDoc()
    sync(a.doc, b.doc)
    await setPassword(a, SLUG, 'banana split 99')
    sync(a.doc, b.doc)
    expect(allItems(b)).toHaveLength(0)
    const info = lockInfo(b)!
    expect(await tryPassword(SLUG, info, 'wrong password')).toBeNull()
    expect(await tryPassword(SLUG, info, 'banana split 99')).toMatchObject({ salt: info.salt })
  })

  it('changing the password moves the list again and empties the old one', async () => {
    const open = list()
    const first = await setPassword(open, SLUG, 'banana split 99')
    const locked = await stored(first)
    add(locked, 'crisps')

    const next = await changePassword(open, locked, SLUG, 'mango chutney 7')
    expect(next.salt).not.toBe(first.salt)
    const info = lockInfo(open)!
    expect(await tryPassword(SLUG, info, 'banana split 99')).toBeNull()
    expect(await tryPassword(SLUG, info, 'mango chutney 7')).not.toBeNull()

    // The old password opens nothing any more.
    expect(isRetired(locked)).toBe(true)
    expect(allItems(locked)).toHaveLength(0)
    expect(usuals(locked)).toHaveLength(0)

    const fresh = await stored(next)
    expect(names(fresh)).toEqual(['crisps', 'eggs', 'halloumi'])
    expect(isRetired(fresh)).toBe(false)
  })

  it('removing the password puts everything back under the words alone', async () => {
    const open = list()
    const order = getAisleOrder(open)
    const lock = await setPassword(open, SLUG, 'banana split 99')
    const locked = await stored(lock)
    add(locked, 'crisps')
    // A device still on the words syncs the removal too, and its copy comes back filled.
    const other = createListDoc()
    sync(open.doc, other.doc)

    removePassword(open, locked)
    expect(lockInfo(open)).toBeNull()
    expect(names(open)).toEqual(['crisps', 'eggs', 'halloumi'])
    expect(usuals(open).map((u) => u.name)).toEqual(['milk', 'bread'])
    expect(getAisleOrder(open)).toEqual(order)
    expect(isRetired(locked)).toBe(true)
    expect(allItems(locked)).toHaveLength(0)

    sync(open.doc, other.doc)
    expect(lockInfo(other)).toBeNull()
    expect(names(other)).toEqual(['crisps', 'eggs', 'halloumi'])

    // And the list can be given a password again.
    const again = await setPassword(open, SLUG, 'banana split 99')
    expect(again.salt).not.toBe(lock.salt)
    expect(names(await stored(again))).toEqual(['crisps', 'eggs', 'halloumi'])
  })
})
