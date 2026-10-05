import * as Y from 'yjs'
import { categorise, DEFAULT_ORDER } from './aisles'
import { itemKey, type ParsedItem } from './parse'

/** Transaction origin for edits made on this device; only these are undoable. */
export const LOCAL = Symbol('local')

export interface Item {
  id: string
  name: string
  key: string
  qty: number | null
  unit: string | null
  note: string | null
  aisle: string
  done: boolean
  /** Looked for it in the shop and it wasn't there. */
  missing: boolean
  addedAt: number
  doneAt: number | null
}

export interface HistoryEntry {
  name: string
  count: number
  lastAt: number
  unit: string | null
}

export interface ListDoc {
  doc: Y.Doc
  items: Y.Map<Y.Map<unknown>>
  history: Y.Map<HistoryEntry>
  aisleFor: Y.Map<string>
  meta: Y.Map<unknown>
  undo: Y.UndoManager
}

export function createListDoc(doc = new Y.Doc()): ListDoc {
  const items = doc.getMap<Y.Map<unknown>>('items')
  const history = doc.getMap<HistoryEntry>('history')
  const aisleFor = doc.getMap<string>('aisleFor')
  const meta = doc.getMap<unknown>('meta')
  // History is tracked so undoing an add also rolls back its usuals count, and forgetting a usual can be undone.
  const undo = new Y.UndoManager([items, history, aisleFor, meta], {
    trackedOrigins: new Set([LOCAL]),
    // Each operation is one transaction, so each is its own undo step.
    captureTimeout: 0,
  })
  return { doc, items, history, aisleFor, meta, undo }
}

function newId(): string {
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function readItem(id: string, m: Y.Map<unknown>): Item {
  return {
    id,
    name: (m.get('name') as string) ?? '',
    key: (m.get('key') as string) ?? '',
    qty: (m.get('qty') as number | null) ?? null,
    unit: (m.get('unit') as string | null) ?? null,
    note: (m.get('note') as string | null) ?? null,
    aisle: (m.get('aisle') as string) ?? 'other',
    done: Boolean(m.get('done')),
    missing: Boolean(m.get('missing')),
    addedAt: (m.get('addedAt') as number) ?? 0,
    doneAt: (m.get('doneAt') as number | null) ?? null,
  }
}

export function allItems(ld: ListDoc): Item[] {
  const out: Item[] = []
  ld.items.forEach((m, id) => out.push(readItem(id, m)))
  return out
}

export function aisleOf(ld: ListDoc, name: string): string {
  return ld.aisleFor.get(itemKey(name)) ?? categorise(name)
}

export interface AddResult {
  added: string[]
  merged: string[]
}

function mergeQty(a: Item, b: ParsedItem): { qty: number | null; unit: string | null } {
  if (a.unit === b.unit) {
    const qa = a.qty ?? 1
    const qb = b.qty ?? 1
    return { qty: qa + qb, unit: a.unit }
  }
  // Different units ("1 bottle milk" + "2 pints milk"): trust the newest wording.
  return { qty: b.qty, unit: b.unit }
}

export function addItems(ld: ListDoc, parsed: ParsedItem[]): AddResult {
  const result: AddResult = { added: [], merged: [] }
  const now = Date.now()
  const touched = new Set<string>()
  ld.doc.transact(() => {
    const existing = allItems(ld)
    for (const p of parsed) {
      const key = itemKey(p.name)
      if (!key) continue
      const match = existing.find((i) => i.key === key)
      if (match) {
        const m = ld.items.get(match.id)!
        if (match.done) {
          // Already bought this trip and needed again: bring it back fresh.
          m.set('done', false)
          m.set('doneAt', null)
          m.set('qty', p.qty)
          m.set('unit', p.unit)
        } else {
          const q = mergeQty(match, p)
          m.set('qty', q.qty)
          m.set('unit', q.unit)
        }
        if (p.note) m.set('note', match.note && match.note !== p.note ? `${match.note}; ${p.note}` : p.note)
        m.set('missing', false)
        result.merged.push(match.name)
        Object.assign(match, readItem(match.id, m))
      } else {
        const id = newId()
        const m = new Y.Map<unknown>()
        m.set('name', p.name)
        m.set('key', key)
        m.set('qty', p.qty)
        m.set('unit', p.unit)
        m.set('note', p.note)
        m.set('aisle', aisleOf(ld, p.name))
        m.set('done', false)
        m.set('missing', false)
        m.set('addedAt', now)
        m.set('doneAt', null)
        ld.items.set(id, m)
        existing.push(readItem(id, m))
        result.added.push(p.name)
      }
      const h = ld.history.get(key)
      touched.add(key)
      ld.history.set(key, {
        name: p.name,
        count: (h?.count ?? 0) + 1,
        lastAt: now,
        unit: p.unit ?? h?.unit ?? null,
      })
    }
    pruneHistory(ld, now, touched)
  }, LOCAL)
  return result
}

/** Most entries kept in history; beyond this the least used are dropped. */
export const HISTORY_CAP = 200
/** One-off entries untouched for this long are dropped. */
export const HISTORY_STALE_MS = 90 * 24 * 60 * 60 * 1000

/**
 * Keep history bounded: drop one-off entries not seen for 90 days, then cap the
 * total by usage. Only ever deletes keys, so concurrent prunes on other devices
 * merge cleanly. Keys in `keep` (just added) are never dropped.
 */
export function pruneHistory(ld: ListDoc, now = Date.now(), keep: Set<string> = new Set()): number {
  const doomed: string[] = []
  const live: (HistoryEntry & { key: string })[] = []
  ld.history.forEach((h, key) => {
    if (keep.has(key)) return
    if (h.count <= 1 && now - h.lastAt > HISTORY_STALE_MS) doomed.push(key)
    else live.push({ ...h, key })
  })
  const room = HISTORY_CAP - keep.size
  if (live.length > room) {
    live.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt || (a.key < b.key ? -1 : 1))
    for (const h of live.slice(Math.max(0, room))) doomed.push(h.key)
  }
  if (doomed.length) ld.doc.transact(() => doomed.forEach((k) => ld.history.delete(k)), LOCAL)
  return doomed.length
}

/** Stop suggesting something as a usual (e.g. a typo). Undoable. */
export function forgetUsual(ld: ListDoc, key: string): void {
  if (!ld.history.has(key)) return
  ld.doc.transact(() => ld.history.delete(key), LOCAL)
}

export function setDone(ld: ListDoc, id: string, done: boolean): void {
  const m = ld.items.get(id)
  if (!m) return
  ld.doc.transact(() => {
    m.set('done', done)
    m.set('doneAt', done ? Date.now() : null)
    if (done) m.set('missing', false)
  }, LOCAL)
}

export function setMissing(ld: ListDoc, id: string, missing: boolean): void {
  const m = ld.items.get(id)
  if (!m) return
  ld.doc.transact(() => {
    m.set('missing', missing)
    if (missing) {
      m.set('done', false)
      m.set('doneAt', null)
    }
  }, LOCAL)
}

export function updateItem(
  ld: ListDoc,
  id: string,
  patch: Partial<Pick<Item, 'name' | 'qty' | 'unit' | 'note'>>,
): void {
  const m = ld.items.get(id)
  if (!m) return
  ld.doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) m.set(k, v)
    if (patch.name !== undefined) m.set('key', itemKey(patch.name))
  }, LOCAL)
}

/** Move an item to another aisle and remember that choice for this list. */
export function setAisle(ld: ListDoc, id: string, aisle: string): void {
  const m = ld.items.get(id)
  if (!m) return
  ld.doc.transact(() => {
    m.set('aisle', aisle)
    ld.aisleFor.set(m.get('key') as string, aisle)
  }, LOCAL)
}

export function removeItem(ld: ListDoc, id: string): void {
  ld.doc.transact(() => ld.items.delete(id), LOCAL)
}

/** End of a shop: clear everything that was bought. Unfound items stay for next time. */
export function finishShop(ld: ListDoc): number {
  let n = 0
  ld.doc.transact(() => {
    ld.items.forEach((m, id) => {
      if (m.get('done')) {
        ld.items.delete(id)
        n++
      }
    })
  }, LOCAL)
  return n
}

export function clearAll(ld: ListDoc): void {
  ld.doc.transact(() => ld.items.forEach((_, id) => ld.items.delete(id)), LOCAL)
}

export function getAisleOrder(ld: ListDoc): string[] {
  const saved = ld.meta.get('aisleOrder') as string[] | undefined
  if (!saved) return [...DEFAULT_ORDER]
  // Keep any aisles added in later versions of the app.
  return [...saved.filter((a) => DEFAULT_ORDER.includes(a)), ...DEFAULT_ORDER.filter((a) => !saved.includes(a))]
}

export function setAisleOrder(ld: ListDoc, order: string[]): void {
  ld.doc.transact(() => ld.meta.set('aisleOrder', order), LOCAL)
}

/** The list has been moved to new words. Where to is deliberately not stored. */
export function isMoved(ld: ListDoc): boolean {
  return ld.meta.get('moved') === true
}

/**
 * Move a list to new words: returns its whole state (items, usuals, aisle order) as a Yjs update to seed the
 * new list, then empties this one and marks it moved. The new words are never written here, or anyone who
 * still has the old words would learn them. Not undoable: undo would put the items back under the old words.
 */
export function moveOut(ld: ListDoc): Uint8Array {
  const state = Y.encodeStateAsUpdate(ld.doc)
  ld.doc.transact(() => {
    ld.items.forEach((_, id) => ld.items.delete(id))
    ld.history.forEach((_, key) => ld.history.delete(key))
    ld.aisleFor.forEach((_, key) => ld.aisleFor.delete(key))
    ld.meta.set('moved', true)
    ld.meta.set('movedAt', Date.now())
  })
  ld.undo.clear()
  return state
}

export interface AisleGroup {
  aisle: string
  todo: Item[]
  done: Item[]
}

export function groupByAisle(items: Item[], order: string[]): AisleGroup[] {
  const groups = new Map<string, AisleGroup>()
  for (const a of order) groups.set(a, { aisle: a, todo: [], done: [] })
  for (const it of items) {
    const g = groups.get(it.aisle) ?? groups.get('other')!
    ;(it.done ? g.done : g.todo).push(it)
  }
  for (const g of groups.values()) {
    g.todo.sort((a, b) => Number(a.missing) - Number(b.missing) || a.addedAt - b.addedAt)
    g.done.sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0))
  }
  return [...groups.values()].filter((g) => g.todo.length || g.done.length)
}

export type Usual = HistoryEntry & { key: string }

/** Frequently added items that are not currently needed. */
export function usuals(ld: ListDoc, limit = 12): Usual[] {
  const onList = new Set(
    allItems(ld)
      .filter((i) => !i.done)
      .map((i) => i.key),
  )
  const out: Usual[] = []
  ld.history.forEach((h, key) => {
    if (!onList.has(key) && h.count >= 2) out.push({ ...h, key })
  })
  return out.sort((a, b) => b.count - a.count || b.lastAt - a.lastAt).slice(0, limit)
}

export function suggest(ld: ListDoc, prefix: string, limit = 6): HistoryEntry[] {
  const p = prefix.trim().toLowerCase()
  if (p.length < 1) return []
  const onList = new Set(
    allItems(ld)
      .filter((i) => !i.done)
      .map((i) => i.key),
  )
  const out: (HistoryEntry & { key: string; score: number })[] = []
  ld.history.forEach((h, key) => {
    if (onList.has(key)) return
    const n = h.name.toLowerCase()
    const score = n.startsWith(p) ? 2 : n.includes(` ${p}`) ? 1 : 0
    if (score) out.push({ ...h, key, score })
  })
  return out.sort((a, b) => b.score - a.score || b.count - a.count).slice(0, limit)
}
