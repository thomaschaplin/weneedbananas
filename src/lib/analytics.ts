import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

const LIST_PATH = /^\/[^/?#]+\.[^/?#]+\.[^/?#]+\/?(?=[?#]|$)/

/**
 * A list's three words are its key, so they must never leave the device in a URL.
 * `path` replaces the whole path, for pages (like the 404) whose URL could be anything.
 */
export function redactUrl(url: string, path?: string): string {
  const u = new URL(url)
  if (path) u.pathname = path
  else if (LIST_PATH.test(u.pathname)) u.pathname = '/list'
  u.search = ''
  u.hash = ''
  return u.toString()
}

export function initAnalytics(path?: string): void {
  if (!import.meta.env.PROD) return
  inject({ framework: 'vite', beforeSend: (e) => ({ ...e, url: redactUrl(e.url, path) }) })
  injectSpeedInsights({ framework: 'vite', beforeSend: (e) => ({ ...e, url: redactUrl(e.url, path) }) })
}
