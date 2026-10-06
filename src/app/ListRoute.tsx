import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { clearDocument } from 'y-indexeddb'
import type { Lock } from '../lib/crypto'
import { isRetired, lockInfo } from '../lib/doc'
import {
  changePassword,
  forgetPassword,
  publishLocked,
  removePassword,
  savedPassword,
  savePassword,
  setPassword,
  tryPassword,
} from '../lib/lock'
import { storeName } from '../lib/move'
import { ListApp, type PasswordControls } from './ListApp'
import type { ToastData } from './Toast'
import { PasswordPrompt } from './Password'
import { useList, type ListHandle } from './useList'

type View =
  | { kind: 'open' }
  | { kind: 'checking' }
  | { kind: 'prompt'; changed: boolean }
  | { kind: 'locked'; lock: Lock; key: string }

/**
 * A list's page. The list under the words alone is always open, and is the whole list unless it has a
 * password. Then it holds only where the password list is (a salt and a public key) and this device opens the
 * password list behind it, once it has the password.
 */
export function ListRoute({ slug, prefill }: { slug: string; prefill?: string }) {
  const open = useList(slug)
  const info = useMemo(() => lockInfo(open.ld), [open.version])
  const [view, setView] = useState<View>({ kind: 'open' })
  const [working, setWorking] = useState<string | undefined>()
  // While the password is being added, changed or removed, the list's lock moves step by step; hold the page
  // still until it's done.
  const busy = useRef(false)
  const [recheck, setRecheck] = useState(0)
  const [notice, setNotice] = useState<ToastData | null>(null)
  const notices = { notice, onNotice: (text: string) => setNotice({ id: Date.now(), text }) }

  useEffect(() => {
    if (!open.loaded || busy.current) return
    if (!info) {
      // The password was removed (perhaps on another device): nothing left to remember.
      if (savedPassword(slug)) forgetPassword(slug)
      return setView({ kind: 'open' })
    }
    if (view.kind === 'locked' && view.lock.salt === info.salt && view.key === info.key) return
    const saved = savedPassword(slug)
    if (!saved) return setView({ kind: 'prompt', changed: false })
    let live = true
    setView({ kind: 'checking' })
    void tryPassword(slug, info, saved).then((lock) => {
      if (!live) return
      setView(lock ? { kind: 'locked', lock, key: info.key } : { kind: 'prompt', changed: true })
    })
    return () => {
      live = false
    }
  }, [open.loaded, info?.salt, info?.key, recheck])

  // Nobody on the words alone should see who's at the shop on a password list.
  useEffect(() => {
    if (info) open.provider.current?.setPresence({ name: '', shopping: false })
  }, [!!info])

  /** Run a change to the lock, then let the page catch up. */
  const run = async (label: string, work: () => Promise<void>) => {
    busy.current = true
    setWorking(label)
    try {
      await work()
    } finally {
      busy.current = false
      setWorking(undefined)
      setRecheck((n) => n + 1)
    }
  }

  const unlock = async (password: string): Promise<boolean> => {
    if (!info) return true
    const lock = await tryPassword(slug, info, password)
    if (!lock) return false
    savePassword(slug, lock.password)
    setView({ kind: 'locked', lock, key: info.key })
    return true
  }

  if (view.kind === 'prompt' && info) return <PasswordPrompt slug={slug} changed={view.changed} onSubmit={unlock} />
  if (view.kind === 'checking') return null
  if (view.kind === 'locked' && info) {
    return (
      <LockedList
        key={view.lock.salt}
        slug={slug}
        prefill={prefill}
        open={open}
        lock={view.lock}
        working={working}
        run={run}
        {...notices}
        onReenter={() => {
          forgetPassword(slug)
          setView({ kind: 'prompt', changed: true })
        }}
      />
    )
  }

  const controls: PasswordControls = {
    locked: false,
    set: (password) =>
      run('Adding the password…', async () => {
        savePassword(slug, password)
        try {
          await setPassword(open.ld, slug, password, (lock) => publishLocked(slug, lock))
        } catch (e) {
          forgetPassword(slug)
          throw e
        }
        await open.flush()
      }),
    remove: async () => {},
  }
  return <ListApp slug={slug} prefill={prefill} list={open} password={controls} working={working} {...notices} />
}

function LockedList({
  slug,
  prefill,
  open,
  lock,
  working,
  run,
  onReenter,
  notice,
  onNotice,
}: {
  slug: string
  prefill?: string
  open: ListHandle
  lock: Lock
  working?: string
  run: (label: string, work: () => Promise<void>) => Promise<void>
  onReenter: () => void
  notice: ToastData | null
  onNotice: (text: string) => void
}) {
  const locked = useList(slug, lock)
  const retired = useMemo(() => isRetired(locked.ld), [locked.version])

  /** Once the emptied password list has reached a relay, this device can let it go. */
  const dropOld = (sent: boolean) => {
    if (sent) setTimeout(() => void clearDocument(storeName({ slug, lock })), 1000)
  }

  const controls: PasswordControls = {
    locked: true,
    set: (password) =>
      run('Changing the password…', async () => {
        const next = await changePassword(open.ld, locked.ld, slug, password, (lock) => publishLocked(slug, lock))
        savePassword(slug, next.password)
        const [sent] = await Promise.all([locked.flush(), open.flush()])
        dropOld(sent)
      }),
    remove: () =>
      run('Removing the password…', async () => {
        removePassword(open.ld, locked.ld)
        forgetPassword(slug)
        const [sent] = await Promise.all([locked.flush(), open.flush()])
        dropOld(sent)
      }),
  }

  const list: ListHandle = {
    ...locked,
    // Removing the list from this device removes both halves, and the password.
    removeLocal: async () => {
      await locked.removeLocal()
      await open.removeLocal()
      forgetPassword(slug)
    },
  }

  return (
    <ListApp
      slug={slug}
      prefill={prefill}
      list={list}
      password={controls}
      working={working}
      retired={retired}
      onReenter={onReenter}
      notice={notice}
      onNotice={onNotice}
    />
  )
}
