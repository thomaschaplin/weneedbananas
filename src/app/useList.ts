import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Lock } from '../lib/crypto'
import { createListDoc } from '../lib/doc'
import { Mailbox, type MailboxStatus } from '../lib/mailbox'
import { moveList, storeName } from '../lib/move'
import { P2PProvider, type SyncStatus } from '../lib/p2p'
import { getName } from '../lib/recent'

const lastSyncKey = (slug: string) => `wnb:sync:${slug}`

function readLastSync(slug: string): number | null {
  try {
    const v = localStorage.getItem(lastSyncKey(slug))
    return v ? Number(v) : null
  } catch {
    return null
  }
}

/**
 * Open a list: the words alone, or with `lock` the password list behind them. `announce` is false for the list
 * under the words alone once it has a password, so this device's name isn't shown to anyone without it.
 */
export function useList(slug: string, lock?: Lock, announce = true) {
  const salt = lock?.salt
  const ld = useMemo(() => createListDoc(), [slug, salt])
  const [version, setVersion] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<SyncStatus>({
    online: navigator.onLine,
    peers: 0,
    lastSyncAt: null,
    presence: {},
  })
  const [mailbox, setMailbox] = useState<MailboxStatus>({ state: 'connecting', receivedAt: null })
  const [lastSync, setLastSync] = useState<number | null>(() => readLastSync(slug))
  const provider = useRef<P2PProvider | null>(null)
  const persistence = useRef<IndexeddbPersistence | null>(null)
  const box = useRef<Mailbox | null>(null)

  useEffect(() => {
    const scope = { slug, lock }
    const idb = new IndexeddbPersistence(storeName(scope), ld.doc)
    persistence.current = idb
    const mb = new Mailbox(ld.doc, scope)
    box.current = mb
    const unsubBox = mb.subscribe(setMailbox)
    void idb.whenSynced.then(() => {
      setLoaded(true)
      void mb.start(ld.doc.store.clients.size > 0)
    })

    const bump = () => setVersion((v) => v + 1)
    ld.doc.on('update', bump)

    const p2p = new P2PProvider(ld.doc, scope, { name: announce ? getName() : '', shopping: false })
    provider.current = p2p
    const unsub = p2p.subscribe(setStatus)
    void p2p.connect()

    return () => {
      unsub()
      unsubBox()
      ld.doc.off('update', bump)
      mb.destroy()
      p2p.destroy()
      void idb.destroy()
    }
  }, [ld, slug, salt])

  // Changes picked up from the mailbox came from another device too.
  const syncedAt = Math.max(status.lastSyncAt ?? 0, mailbox.receivedAt ?? 0) || null
  useEffect(() => {
    if (!syncedAt) return
    setLastSync(syncedAt)
    try {
      localStorage.setItem(lastSyncKey(slug), String(syncedAt))
    } catch {
      /* ignore */
    }
  }, [syncedAt, slug])

  /** Wipe this list from this device only. With `keepPrefs`, plan/shop mode and last sync time stay. */
  const removeLocal = async (keepPrefs = false) => {
    provider.current?.destroy()
    box.current?.destroy()
    await persistence.current?.clearData()
    if (keepPrefs) return
    try {
      localStorage.removeItem(lastSyncKey(slug))
      localStorage.removeItem(`wnb:mode:${slug}`)
    } catch {
      /* ignore */
    }
  }

  /**
   * Move this list to new words and return them. Once the old list's "moved" marker has reached a relay
   * (open devices get it straight away), this device lets the old list go; if no relay confirms it, the old
   * copy stays on this device so the marker isn't lost.
   */
  const moveToNewWords = async (): Promise<string> => {
    const next = await moveList(ld, slug)
    const saved = (await box.current?.flushNow()) ?? false
    if (saved) await removeLocal()
    return next
  }

  /** Send this list's copy to the relays now; true once one holds it. */
  const flush = async (): Promise<boolean> => (await box.current?.flushNow()) ?? false

  return { ld, version, loaded, status, mailbox, lastSync, provider, removeLocal, moveToNewWords, flush }
}

export type ListHandle = ReturnType<typeof useList>
