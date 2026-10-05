// Plain-text export (copy or send a list as text) and import (text shared into the app).
import { AISLE_BY_ID } from './aisles'
import { groupByAisle, type Item } from './doc'
import { formatQty } from './parse'

export function itemLine(it: Pick<Item, 'name' | 'qty' | 'unit' | 'note'>): string {
  const qty = formatQty(it.qty, it.unit)
  return `- ${qty ? `${qty} ` : ''}${it.name}${it.note ? ` (${it.note})` : ''}`
}

/** The items still to get, grouped by aisle in the list's order, ready to paste into a message. */
export function listAsText(slug: string, items: Item[], order: string[], url?: string): string {
  const groups = groupByAisle(
    items.filter((i) => !i.done),
    order,
  )
  const out = [`Shopping list (${slug})`]
  if (!groups.length) out.push('', 'Nothing left to get.')
  for (const g of groups) {
    const aisle = AISLE_BY_ID[g.aisle] ?? AISLE_BY_ID.other
    out.push('', `${aisle.icon} ${aisle.label}`, ...g.todo.map(itemLine))
  }
  if (url) out.push('', `Shared list: ${url}`)
  return out.join('\n')
}

const URL_ONLY = /^\s*https?:\/\/\S+\s*$/i

/**
 * Turn what another app shared (Web Share Target title and text) into text for the add bar.
 * Bare links (and the separate url param) are dropped; the title is only used when there's no text.
 */
export function sharedText(title: string | null, text: string | null): string {
  const body = text?.trim() ? text : (title ?? '')
  return body
    .split(/\r?\n|\r/)
    .filter((l) => !URL_ONLY.test(l))
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
}

/** The add bar is one line, so lines become comma-separated entries (the parser splits on both). */
export function toAddBarText(text: string): string {
  return text
    .split(/\n/)
    .map((l) => l.trim().replace(/[,;]+$/, ''))
    .filter(Boolean)
    .join(', ')
}
