import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Lock } from '../src/lib/crypto'
import { addItems, addPasskey, createListDoc, lockInfo, passkeys, removePasskeys, type ListDoc } from '../src/lib/doc'
import { changePassword, removePassword, setPassword, tryPassword } from '../src/lib/lock'
import { storeName } from '../src/lib/move'
import { parseMany } from '../src/lib/parse'
import { createPasskey, seal, unlockWithPasskey, unseal } from '../src/lib/passkey'

const SLUG = 'lemon.fork.bulb'
const secret = (n: number) => new Uint8Array(32).fill(n)

async function stored(lock: Lock): Promise<ListDoc> {
  const ld = createListDoc()
  const idb = new IndexeddbPersistence(storeName({ slug: SLUG, lock }), ld.doc)
  await idb.whenSynced
  await idb.destroy()
  return ld
}

async function lockedList() {
  const open = createListDoc()
  addItems(open, parseMany('milk, bread'))
  const lock = await setPassword(open, SLUG, 'banana split 99')
  return { open, lock }
}

describe('passkeys', () => {
  it('seal the password so only the same passkey secret, for the same list, gets it back', async () => {
    const lock = { password: ' banana split 99 ', salt: 'ab' }
    const entry = await seal(SLUG, lock, secret(1))
    expect(entry.salt).toBe('ab')
    expect(entry.ct).not.toContain('banana')
    expect(await unseal(SLUG, entry, secret(1))).toBe('banana split 99')
    expect(await unseal(SLUG, entry, secret(2))).toBeNull()
    expect(await unseal('apple.fork.bulb', entry, secret(1))).toBeNull()
    expect(await unseal(SLUG, { ...entry, salt: 'cd' }, secret(1))).toBeNull()
  })

  it('are kept with the list under the words, and the sealed password opens the list', async () => {
    const { open, lock } = await lockedList()
    addPasskey(open, 'cred-a', await seal(SLUG, lock, secret(1)))
    addPasskey(open, 'cred-b', await seal(SLUG, lock, secret(2)))
    const keys = passkeys(open)
    expect([...keys.keys()].sort()).toEqual(['cred-a', 'cred-b'])
    expect(JSON.stringify(open.doc.toJSON())).not.toContain('banana split')

    const password = await unseal(SLUG, keys.get('cred-b')!, secret(2))
    expect(await tryPassword(SLUG, lockInfo(open)!, password!)).toMatchObject({ salt: lock.salt })

    removePasskeys(open)
    expect(passkeys(open).size).toBe(0)
  })

  it('are dropped when the password changes or is removed', async () => {
    const { open, lock } = await lockedList()
    addPasskey(open, 'cred-a', await seal(SLUG, lock, secret(1)))
    const locked = await stored(lock)

    const next = await changePassword(open, locked, SLUG, 'mango chutney 7')
    expect(passkeys(open).size).toBe(0)

    addPasskey(open, 'cred-a', await seal(SLUG, next, secret(1)))
    expect(passkeys(open).size).toBe(1)
    removePassword(open, await stored(next))
    expect(passkeys(open).size).toBe(0)
    expect(Object.keys(open.meta.toJSON()).filter((k) => k.startsWith('passkey:'))).toEqual([])
  })

  it('sealed for an old password are not offered', async () => {
    const { open, lock } = await lockedList()
    // e.g. arriving late from a device that hadn't seen the change.
    addPasskey(open, 'stale', await seal(SLUG, { ...lock, salt: 'old' }, secret(1)))
    expect(passkeys(open).size).toBe(0)
  })
})

describe('passkey prompts', () => {
  afterEach(() => vi.unstubAllGlobals())

  // Browsers only show a passkey prompt straight from a tap; Safari refuses one asked for after an await, which
  // let a passkey unlock a list once and then silently do nothing.
  it('are asked for without awaiting anything first', async () => {
    const get = vi.fn((_: CredentialRequestOptions) => new Promise<never>(() => {}))
    const create = vi.fn(() => new Promise<never>(() => {}))
    vi.stubGlobal('navigator', { credentials: { get, create } })

    void unlockWithPasskey(SLUG, { salt: 'ab', key: 'cd' }, new Map([['AQID', { salt: 'ab', iv: '', ct: '' }]]))
    expect(get).toHaveBeenCalledTimes(1)
    // Everyone's passkeys are in the list; naming them makes password managers balk at the ones they don't hold.
    expect(get.mock.calls[0]).toMatchObject([{ publicKey: { allowCredentials: [] } }])
    void createPasskey(SLUG, { password: 'banana split 99', salt: 'ab' })
    expect(create).toHaveBeenCalledTimes(1)
  })
})
