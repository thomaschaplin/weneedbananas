/**
 * URLs inside the app. On the web a list lives at /word.word.word and pages at clean URLs. The iOS
 * and Android apps serve the built files from the device, where /lemon.fork.bulb would be taken for
 * a missing file with a ".bulb" extension, so there a list is /list.html?l=word.word.word and pages
 * keep their .html.
 *
 * Vite replaces __WNB_NATIVE__ with a constant, so the web bundle drops the app-only code. When
 * prerendering under Node, the build passes VITE_NATIVE through the environment instead, so
 * prerendered links match the app they're for.
 */
declare const __WNB_NATIVE__: boolean | undefined
export const NATIVE: boolean =
  typeof __WNB_NATIVE__ === 'boolean' ? __WNB_NATIVE__ : globalThis.process?.env?.VITE_NATIVE === '1'

/** The public web address of a list, for sharing. Never a device-local URL. */
export const webListUrl = (slug: string) => `https://weneedbananas.com/${slug}`

export function listUrl(slug: string, hash = ''): string {
  return NATIVE ? `/list.html?l=${slug}${hash}` : `/${slug}${hash}`
}

export type Page = '' | 'how-it-works' | 'privacy'

export function pageUrl(page: Page): string {
  if (!NATIVE) return `/${page}`
  return page ? `/${page}.html` : '/index.html'
}

/** What the list shell was opened for: the raw list name, or 'share-target'. */
export function routeFrom(loc: { pathname: string; search: string }): string {
  if (NATIVE) {
    const l = new URLSearchParams(loc.search).get('l')
    if (l !== null) return l
  }
  return decodeURIComponent(loc.pathname.slice(1)).replace(/\/$/, '')
}
