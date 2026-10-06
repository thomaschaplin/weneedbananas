// iOS and Android only (see src/lib/nav.ts): the entries load this with a dynamic import behind
// NATIVE, so none of it reaches the web bundle.
import { App } from '@capacitor/app'
import { listUrl, pageUrl } from './lib/nav'
import { SLUG_RE } from './lib/slug'

/** Where a weneedbananas.com link opened in the app should go, as an app-local URL. */
export function appUrlFor(link: string): string {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return pageUrl('')
  }
  const path = decodeURIComponent(url.pathname.slice(1)).replace(/\/$/, '').toLowerCase()
  if (SLUG_RE.test(path)) return listUrl(path, url.hash)
  if (path === 'how-it-works' || path === 'privacy') return pageUrl(path)
  return pageUrl('')
}

export function initNative(): void {
  // A list link tapped in another app (universal links on iOS, app links on Android). Capacitor
  // holds on to the link that launched the app until a page listens for it.
  void App.addListener('appUrlOpen', ({ url }) => location.assign(appUrlFor(url)))
}
