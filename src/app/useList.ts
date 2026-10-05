import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createListDoc } from '../lib/doc'
import { Mailbox, type MailboxStatus } from '../lib/mailbox'
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

export function useList(slug: string) {
  const ld = useMemo(() => createListDoc(), [slug])
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
    const idb = new IndexeddbPersistence(`wnb:${slug}`, ld.doc)
    persistence.current = idb
    const mb = new Mailbox(ld.doc, slug)
    box.current = mb
    const unsubBox = mb.subscribe(setMailbox)
    void idb.whenSynced.then(() => {
      setLoaded(true)
      void mb.start(ld.doc.store.clients.size > 0)
    })

    const bump = () => setVersion((v) => v + 1)
    ld.doc.on('update', bump)

    const p2p = new P2PProvider(ld.doc, slug, { name: getName(), shopping: false })
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
  }, [ld, slug])

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

  /** Wipe this list from this device only. */
  const removeLocal = async () => {
    provider.current?.destroy()
    box.current?.destroy()
    await persistence.current?.clearData()
    try {
      localStorage.removeItem(lastSyncKey(slug))
      localStorage.removeItem(`wnb:mode:${slug}`)
    } catch {
      /* ignore */
    }
  }

  return { ld, version, loaded, status, mailbox, lastSync, provider, removeLocal }
}
