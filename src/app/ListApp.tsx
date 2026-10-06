import { useEffect, useMemo, useState } from 'preact/hooks'
import { AISLE_BY_ID } from '../lib/aisles'
import {
  addItems,
  allItems,
  clearAll,
  finishShop,
  forgetUsual,
  getAisleOrder,
  groupByAisle,
  isMoved,
  removeItem,
  setAisle,
  setAisleOrder,
  setDone,
  setMissing,
  updateItem,
  usuals,
  type Item,
} from '../lib/doc'
import type { ParsedItem } from '../lib/parse'
import { forgetList, getName, rememberList, setName } from '../lib/recent'
import { buzz, keepAwake } from '../lib/wakelock'
import { BananaMark } from '../landing/Logo'
import { ThemeToggle } from '../landing/ThemeToggle'
import { AddBar } from './AddBar'
import { AisleSection } from './AisleSection'
import { EditForm, type EditActions } from './EditSheet'
import { MenuContent } from './MenuSheet'
import { ShareContent } from './ShareSheet'
import { Sheet } from './Sheet'
import { ShopIdentity } from './ShopIdentity'
import { SyncBadge, SyncInfo } from './SyncBadge'
import { Toast, type ToastData } from './Toast'
import type { ListHandle } from './useList'

type SheetKind = null | 'share' | 'menu' | 'sync' | { edit: string }

const modeKey = (slug: string) => `wnb:mode:${slug}`

/** Adding, changing and removing the list's password; the work happens in ListRoute, which holds both lists. */
export interface PasswordControls {
  /** This list is behind a password. */
  locked: boolean
  /** Add a password, or change it. */
  set: (password: string) => Promise<void>
  remove: () => Promise<void>
  /** Lock the list on this device: forget the password and the copy here until it's typed again. */
  lockDevice?: () => Promise<void>
  /** Unlocking with passkeys instead of the password, where this browser can. */
  passkeys?: PasskeyControls
}

export interface PasskeyControls {
  /** How many passkeys can unlock the list now. */
  count: number
  /** Make a passkey on this device and seal the password with it. */
  add: () => Promise<void>
  removeAll: () => Promise<void>
}

export function ListApp({
  slug,
  prefill,
  list,
  password,
  working,
  retired = false,
  onReenter,
  notice,
  onNotice,
}: {
  slug: string
  prefill?: string
  list: ListHandle
  password?: PasswordControls
  /** Something is being done to the whole list, e.g. "Adding the password…". */
  working?: string
  /** This password list was left behind because its password changed or was removed. */
  retired?: boolean
  /** Forget the password this device has, to type the new one. */
  onReenter?: () => void
  /** A message to show that outlives this page, e.g. across the switch to the list behind a password. */
  notice?: ToastData | null
  onNotice?: (text: string) => void
}) {
  const { ld, version, loaded, status, mailbox, lastSync, provider, removeLocal, moveToNewWords } = list
  const [shopMode, setShopMode] = useState(() => {
    try {
      return localStorage.getItem(modeKey(slug)) === 'shop'
    } catch {
      return false
    }
  })
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const [name, setNameState] = useState(getName)

  const items = useMemo(() => allItems(ld), [version])
  const order = useMemo(() => getAisleOrder(ld), [version])
  const groups = useMemo(() => groupByAisle(items, order), [items, order])
  const usual = useMemo(() => usuals(ld), [version])
  const moved = useMemo(() => isMoved(ld), [version])
  const [movingWords, setMoving] = useState(false)
  const moving = movingWords || !!working
  const todo = items.filter((i) => !i.done).length
  const got = items.length - todo

  const saveName = (n: string) => {
    setName(n)
    setNameState(n.trim().slice(0, 24))
  }

  const say = (text: string, undo?: boolean) =>
    setToast({ id: Date.now(), text, undo: undo ? () => ld.undo.undo() : undefined })

  useEffect(() => {
    if (notice) setToast(notice)
  }, [notice?.id])

  useEffect(() => {
    if (loaded) rememberList(slug, todo)
  }, [loaded, todo, slug])

  // Just moved here from old words: offer to share the new ones straight away.
  useEffect(() => {
    if (location.hash !== '#moved') return
    history.replaceState(null, '', location.pathname)
    setSheet('share')
    say('List moved. Share the new words with everyone you want to keep.')
  }, [])

  const moveAway = async () => {
    setMoving(true)
    try {
      const next = await moveToNewWords()
      forgetList(slug)
      rememberList(next, todo)
      location.replace(`/${next}#moved`)
    } catch {
      setMoving(false)
      say("Couldn't move the list. Try again.")
    }
  }

  const lockHere = async () => {
    try {
      await password?.lockDevice?.()
    } catch {
      say("Couldn't save your latest changes, so the list is still unlocked. Try again when you're online.")
    }
  }

  const removeMoved = async () => {
    await removeLocal()
    forgetList(slug)
    location.href = '/'
  }

  useEffect(() => {
    keepAwake(shopMode)
    provider.current?.setPresence({ name, shopping: shopMode })
    try {
      localStorage.setItem(modeKey(slug), shopMode ? 'shop' : 'plan')
    } catch {
      /* ignore */
    }
    return () => keepAwake(false)
  }, [shopMode, name, slug])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        if (e.shiftKey) ld.undo.redo()
        else ld.undo.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ld])

  const shoppers = Object.values(status.presence)
    .filter((p) => p.shopping)
    .map((p) => p.name || 'Someone')

  const onAdd = (parsed: ParsedItem[]) => {
    const r = addItems(ld, parsed)
    if (r.added.length + r.merged.length === 1) {
      if (r.added.length) {
        const aisle = AISLE_BY_ID[allItems(ld).find((i) => i.name === r.added[0])?.aisle ?? 'other']
        say(`${r.added[0]} → ${aisle.icon} ${aisle.label}`, true)
      } else say(`${r.merged[0]}: updated amount`, true)
    } else {
      say(`Added ${r.added.length + r.merged.length} items`, true)
    }
  }

  const onToggle = (item: Item) => {
    setDone(ld, item.id, !item.done)
    if (!item.done) buzz()
  }

  const editActions: EditActions = {
    save: (id, patch) => {
      updateItem(ld, id, patch)
      say(`Saved ${patch.name}`, true)
    },
    setAisle: (id, a) => {
      setAisle(ld, id, a)
      say(`Moved to ${AISLE_BY_ID[a].label}`, true)
    },
    setMissing: (id, m) => {
      setMissing(ld, id, m)
      if (m) say('Kept for next time', true)
    },
    remove: (id) => {
      const it = items.find((i) => i.id === id)
      removeItem(ld, id)
      say(`Removed ${it?.name ?? 'item'}`, true)
    },
  }

  const finish = () => {
    const n = finishShop(ld)
    setShopMode(false)
    say(`Cleared ${n} bought item${n === 1 ? '' : 's'}. Nice shop!`, true)
  }

  const editing = sheet && typeof sheet === 'object' ? items.find((i) => i.id === sheet.edit) : undefined
  const progress = items.length ? got / items.length : 0

  return (
    <div class={`app${shopMode ? ' shop' : ''}`}>
      <header class="app-header">
        <a href="/" class="home" aria-label="We Need Bananas home">
          <BananaMark size={34} />
        </a>
        <button type="button" class="slug-btn" onClick={() => setSheet('share')} aria-label={`Share list ${slug}`}>
          <span class="slug">{slug}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" class="share-icon">
            <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
        </button>
        {password?.lockDevice && !moving && !retired && (
          <button
            type="button"
            class="icon-btn"
            aria-label="Lock this list on this device"
            title="Lock on this device"
            onClick={() => void lockHere()}
          >
            🔒
          </button>
        )}
        <ThemeToggle />
        <button type="button" class="icon-btn" aria-label="List settings" onClick={() => setSheet('menu')}>
          ⋯
        </button>
      </header>

      {shoppers.length > 0 && !shopMode && (
        <div class="banner" role="status">
          🛒 <strong>{shoppers.join(' & ')}</strong> {shoppers.length === 1 ? 'is' : 'are'} at the shop. Add anything
          you need now.
        </div>
      )}

      <div class="toolbar">
        <div class="mode-switch" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={!shopMode} onClick={() => setShopMode(false)}>
            📝 Plan
          </button>
          <button type="button" role="tab" aria-selected={shopMode} onClick={() => setShopMode(true)}>
            🛒 At the shop
          </button>
        </div>
        <SyncBadge status={status} mailbox={mailbox} onClick={() => setSheet('sync')} />
      </div>

      {shopMode && <ShopIdentity name={name} onName={saveName} />}

      {shopMode && items.length > 0 && (
        <div class="progress" aria-label={`${todo} left to get`}>
          <div class="progress-text">
            <strong>{todo === 0 ? 'All got!' : `${todo} left`}</strong>
            <span class="muted">{got} in the trolley</span>
          </div>
          <div class="progress-bar">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      {!shopMode && !moved && usual.length > 0 && (
        <div class="usuals" aria-label="Your usuals">
          <span class="usuals-label">Usuals</span>
          <div class="chips">
            {usual.map((u) => (
              <span key={u.key} class="chip-group">
                <button
                  type="button"
                  class="chip"
                  onClick={() => onAdd([{ name: u.name, qty: null, unit: null, note: null }])}
                >
                  + {u.name}
                </button>
                <button
                  type="button"
                  class="chip-x"
                  aria-label={`Forget ${u.name}`}
                  title={`Forget ${u.name}`}
                  onClick={() => {
                    forgetUsual(ld, u.key)
                    say(`Forgot ${u.name}`, true)
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <main class="list">
        {(moved || moving) && (
          <div class="empty" role="status">
            <p class="empty-title">{moving ? (working ?? 'Moving to new words…') : 'This list has been moved'}</p>
            {moving ? (
              <p>
                {working
                  ? 'Making sure every device on this list gets the change.'
                  : 'Making sure everyone on the old words sees it has moved.'}
              </p>
            ) : (
              <>
                <p>Ask whoever moved it for the new words.</p>
                <button type="button" class="btn" onClick={removeMoved}>
                  Remove it from this device
                </button>
              </>
            )}
          </div>
        )}
        {retired && !moving && (
          <div class="empty" role="status">
            <p class="empty-title">This list's password has changed</p>
            <p>Ask whoever changed it for the new password.</p>
            <button type="button" class="btn" onClick={onReenter}>
              Enter the new password
            </button>
          </div>
        )}
        {!loaded || moving || retired || (moved && items.length === 0) ? null : items.length === 0 ? (
          <Empty onShare={() => setSheet('share')} />
        ) : (
          groups.map((g) => (
            <AisleSection
              key={g.aisle}
              group={g}
              shopMode={shopMode}
              onToggle={onToggle}
              onEdit={(it) => setSheet({ edit: it.id })}
              onRemove={(it) => editActions.remove(it.id)}
            />
          ))
        )}

        {got > 0 && (
          <div class="finish">
            <button type="button" class={`btn ${shopMode ? 'btn-primary btn-big' : ''}`} onClick={finish}>
              {shopMode ? `✓ Done shopping · clear ${got} bought` : `Clear ${got} ticked item${got === 1 ? '' : 's'}`}
            </button>
            {shopMode && todo > 0 && (
              <p class="muted small">The {todo} you didn't get stay on the list for next time.</p>
            )}
          </div>
        )}
      </main>

      {!moved && !moving && !retired && (
        <AddBar ld={ld} version={version} onAdd={onAdd} compact={shopMode} initial={prefill} />
      )}

      <Sheet open={sheet === 'share'} onClose={() => setSheet(null)} title="Share this list">
        <ShareContent slug={slug} items={items} order={order} locked={password?.locked} />
      </Sheet>
      <Sheet open={sheet === 'sync'} onClose={() => setSheet(null)} title="Sync">
        <SyncInfo status={status} mailbox={mailbox} lastSync={lastSync} onShare={() => setSheet('share')} />
      </Sheet>
      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="List settings">
        <MenuContent
          name={name}
          onName={saveName}
          order={order}
          onOrder={(o) => setAisleOrder(ld, o)}
          itemCount={items.length}
          onClearAll={() => {
            clearAll(ld)
            setSheet(null)
            say('List cleared', true)
          }}
          onMove={password?.locked ? undefined : moveAway}
          moving={moving}
          password={retired ? undefined : password}
          onPasswordDone={(text) => {
            setSheet(null)
            if (onNotice) onNotice(text)
            else say(text)
          }}
          moved={moved}
          onRemoveLocal={async () => {
            await removeLocal()
            forgetList(slug)
            location.href = '/'
          }}
        />
      </Sheet>
      <Sheet open={!!editing} onClose={() => setSheet(null)} title="Edit item">
        {editing && <EditForm key={editing.id} item={editing} actions={editActions} close={() => setSheet(null)} />}
      </Sheet>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}

function Empty({ onShare }: { onShare: () => void }) {
  return (
    <div class="empty">
      <p class="empty-title">Nothing on the list yet</p>
      <ul>
        <li>
          Type things like <code>2 pints milk</code>, <code>500g mince</code> or <code>bananas x6</code>
        </li>
        <li>Paste a recipe's ingredients and each line becomes an item</li>
        <li>Items sort themselves into aisles for the shop</li>
      </ul>
      <button type="button" class="btn" onClick={onShare}>
        Share the list with your household
      </button>
    </div>
  )
}
