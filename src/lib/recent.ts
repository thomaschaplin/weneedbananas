// Lists this device has opened, kept only in this browser.
const KEY = 'wnb:recent'
const NAME_KEY = 'wnb:name'

export interface RecentList {
  slug: string
  openedAt: number
  todo: number
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or storage full: recents are a convenience only */
  }
}

export function recentLists(): RecentList[] {
  return read<RecentList[]>(KEY, []).sort((a, b) => b.openedAt - a.openedAt)
}

export function rememberList(slug: string, todo: number): void {
  const rest = recentLists().filter((r) => r.slug !== slug)
  write(KEY, [{ slug, openedAt: Date.now(), todo }, ...rest].slice(0, 12))
}

export function forgetList(slug: string): void {
  write(
    KEY,
    recentLists().filter((r) => r.slug !== slug),
  )
}

export function getName(): string {
  return read<string>(NAME_KEY, '')
}

export function setName(name: string): void {
  write(NAME_KEY, name.trim().slice(0, 24))
}
