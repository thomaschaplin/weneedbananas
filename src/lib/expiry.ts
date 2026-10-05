// When the encrypted relay copy of a list runs out, and when to nudge someone to open a list to keep it. Pure, so
// it can run in the prerendered landing page and in tests without touching the network or storage.

const DAY_MS = 24 * 60 * 60 * 1000

/** Relays drop the copy this long after the list was last opened or edited (NIP-40 expiration). */
export const EXPIRY_DAYS = 30
/** Start nudging on the home page once a list hasn't been opened here for this long. */
export const WARN_AFTER_DAYS = 25

/** Whole days left until `expiresAt`, rounded up; 0 once it has passed. */
export function daysLeft(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / DAY_MS))
}

/** "today", "tomorrow" or "in 12 days". */
export function inDays(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

/**
 * The hint shown next to a recent list on the home page, or null if it was opened recently enough. Opening the
 * list republishes the relay copy, so the last time this device opened it bounds when the copy runs out
 * (another device may have refreshed it since, which only makes this cautious).
 */
export function recentHint(openedAt: number, now: number): string | null {
  if (!openedAt || now - openedAt < WARN_AFTER_DAYS * DAY_MS) return null
  const left = daysLeft(openedAt + EXPIRY_DAYS * DAY_MS, now)
  return left > 0 ? `Open to keep it safe · ${left} day${left === 1 ? '' : 's'} left` : 'Open to keep it safe'
}
