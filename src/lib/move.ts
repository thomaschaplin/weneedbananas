import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { moveOut, type ListDoc } from './doc'
import { generateSlug } from './slug'

/** IndexedDB database holding a list on this device. */
export const storeName = (slug: string) => `wnb:${slug}`

const sameState = (a: Y.Doc, b: Y.Doc) => Y.equalSnapshots(Y.snapshot(a), Y.snapshot(b))

/** Write a doc into a list's store on this device and read it back, so it has really landed. */
async function save(slug: string, doc: Y.Doc): Promise<void> {
  const write = new IndexeddbPersistence(storeName(slug), doc)
  await write.whenSynced
  await write.destroy()
  const check = new Y.Doc()
  const read = new IndexeddbPersistence(storeName(slug), check)
  await read.whenSynced
  await read.destroy()
  const ok = sameState(check, doc)
  check.destroy()
  if (!ok) throw new Error('could not save the new list')
}

/**
 * Move a list to fresh words: copy it into the new list's store on this device, so the new words open
 * populated (and publish their own mailbox copy as normal), then empty the old list and mark it moved.
 * Returns the new words. The old list is only touched once the copy is safely stored; its change still has to
 * reach other devices and the mailbox.
 */
export async function moveList(ld: ListDoc, slug: string): Promise<string> {
  let next = generateSlug()
  while (next === slug) next = generateSlug()

  const fresh = new Y.Doc()
  try {
    Y.applyUpdate(fresh, Y.encodeStateAsUpdate(ld.doc))
    await save(next, fresh)
    // Anything that arrived from another device in the meantime comes along too.
    const before = Y.snapshot(fresh)
    Y.applyUpdate(fresh, moveOut(ld))
    if (!Y.equalSnapshots(before, Y.snapshot(fresh))) await save(next, fresh)
  } finally {
    fresh.destroy()
  }
  return next
}
