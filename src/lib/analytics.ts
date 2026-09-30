import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

const LIST_PATH = /^\/[^/?#]+\.[^/?#]+\.[^/?#]+\/?(?=[?#]|$)/

/** A list's three words are its key, so they must never leave the device in a URL. */
export function redactUrl(url: string): string {
  const u = new URL(url)
  if (LIST_PATH.test(u.pathname)) u.pathname = '/list'
  u.search = ''
  u.hash = ''
  return u.toString()
}

export function initAnalytics(): void {
  if (!import.meta.env.PROD) return
  inject({ framework: 'vite', beforeSend: (e) => ({ ...e, url: redactUrl(e.url) }) })
  injectSpeedInsights({ framework: 'vite', beforeSend: (e) => ({ ...e, url: redactUrl(e.url) }) })
}
