import { schnorr } from '@noble/secp256k1'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { deriveSecrets, normalizePassword, type Lock } from './crypto'
import { createListDoc, lockOut, retire, setLockInfo, unlockInto, type ListDoc, type LockInfo } from './doc'
import { Mailbox } from './mailbox'
import { save, storeName } from './move'

/** Shortest password accepted. The words already add some strength; the password is what makes guessing hard. */
export const MIN_PASSWORD = 8

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

/** The public key a password list's mailbox copy is published under. */
export async function lockKey(slug: string, lock: Lock): Promise<string> {
  const { mailboxKey } = await deriveSecrets({ slug, lock })
  return hex(schnorr.getPublicKey(mailboxKey))
}

/** The lock if `password` opens the password list recorded in `info`, otherwise null. */
export async function tryPassword(slug: string, info: LockInfo, password: string): Promise<Lock | null> {
  const lock = { password: normalizePassword(password), salt: info.salt }
  return (await lockKey(slug, lock)) === info.key ? lock : null
}

async function newLock(slug: string, password: string): Promise<{ lock: Lock; info: LockInfo }> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const lock = { password: normalizePassword(password), salt }
  return { lock, info: { salt, key: await lockKey(slug, lock) } }
}

/** Called once the password list is stored on this device, before anything points at it. */
export type BeforePointing = (lock: Lock) => Promise<unknown>

/**
 * Store a password list's seed on this device and run `ready` (which sends it to the relays), then empty where
 * it came from and catch anything that changed in the meantime.
 */
async function seed(
  slug: string,
  lock: Lock,
  state: Uint8Array,
  ready: BeforePointing | undefined,
  empty: () => Uint8Array,
): Promise<void> {
  const fresh = new Y.Doc()
  try {
    Y.applyUpdate(fresh, state)
    await save({ slug, lock }, fresh)
    await ready?.(lock)
    const before = Y.snapshot(fresh)
    Y.applyUpdate(fresh, empty())
    if (!Y.equalSnapshots(before, Y.snapshot(fresh))) await save({ slug, lock }, fresh)
  } finally {
    fresh.destroy()
  }
}

/**
 * Give an open list a password: copy it into the password list's store on this device, then empty the list
 * under the words alone, leaving only the salt and public key a device needs to check a password.
 */
export async function setPassword(
  open: ListDoc,
  slug: string,
  password: string,
  ready?: BeforePointing,
): Promise<Lock> {
  const { lock, info } = await newLock(slug, password)
  await seed(slug, lock, Y.encodeStateAsUpdate(open.doc), ready, () => lockOut(open, info))
  return lock
}

/**
 * Change a list's password: copy it to a fresh password list (new salt, so new keys), empty the old one so the
 * old password opens nothing, then point the words at the new one.
 */
export async function changePassword(
  open: ListDoc,
  locked: ListDoc,
  slug: string,
  password: string,
  ready?: BeforePointing,
): Promise<Lock> {
  const { lock, info } = await newLock(slug, password)
  await seed(slug, lock, Y.encodeStateAsUpdate(locked.doc), ready, () => retire(locked))
  setLockInfo(open, info)
  return lock
}

/** Remove a list's password: empty the password list and put everything back under the words alone. */
export function removePassword(open: ListDoc, locked: ListDoc): void {
  const was = createListDoc()
  Y.applyUpdate(was.doc, retire(locked))
  unlockInto(was, open)
  was.doc.destroy()
}

/**
 * Leave the password list's first copy on the relays, from what this device has stored for it. Done before the
 * words point anyone at it, so a device that opens the list later finds it even if this one goes away now.
 * Resolves true once a relay holds it.
 */
export async function publishLocked(slug: string, lock: Lock): Promise<boolean> {
  const scope = { slug, lock }
  const doc = new Y.Doc()
  const idb = new IndexeddbPersistence(storeName(scope), doc)
  const box = new Mailbox(doc, scope)
  try {
    await idb.whenSynced
    await box.start(true)
    return await box.flushNow()
  } finally {
    box.destroy()
    await idb.destroy()
    doc.destroy()
  }
}

// The password is remembered on this device so it isn't asked for every time. The device already holds the
// whole list unencrypted, so this adds nothing for someone who has the device.
const pwKey = (slug: string) => `wnb:pw:${slug}`

export function savedPassword(slug: string): string | null {
  try {
    return localStorage.getItem(pwKey(slug))
  } catch {
    return null
  }
}

export function savePassword(slug: string, password: string): void {
  try {
    localStorage.setItem(pwKey(slug), normalizePassword(password))
  } catch {
    /* private mode: asked again next time */
  }
}

export function forgetPassword(slug: string): void {
  try {
    localStorage.removeItem(pwKey(slug))
  } catch {
    /* ignore */
  }
}
