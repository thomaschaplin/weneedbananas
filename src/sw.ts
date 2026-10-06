import { registerSW as register } from 'virtual:pwa-register'

const UPDATE_INTERVAL = 60 * 60 * 1000
const TEXT_FIELDS = 'input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=hidden]), textarea'

/**
 * True when reloading would lose nothing: no sheet is open, no text field holds a draft, and
 * nothing else on the page has marked itself `data-unsaved`. Fields showing an already-saved
 * value mark themselves `data-saved`.
 */
export function isIdle(doc: Document = document): boolean {
  if (doc.querySelector('dialog[open], [data-unsaved]')) return false
  return [...doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXT_FIELDS)].every(
    (el) => el.hasAttribute('data-saved') || !el.value.trim(),
  )
}

export function registerSW(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  // A new version waits until it's safe to switch: right away if the page is idle, otherwise when
  // the app is next idle and hidden or shown, or when the "New version ready" pill is tapped.
  let pending = false
  let reloading = false
  let pill: HTMLElement | null = null
  let registration: ServiceWorkerRegistration | undefined

  const apply = () => {
    if (reloading) return
    reloading = true
    if (registration?.waiting) updateSW()
    else location.reload()
  }

  // The new version took over, from this tab or another. This tab reloads if it asked for it or
  // is idle; otherwise it keeps its drafts and offers the pill, as its old code may ask for files
  // that are gone.
  const switched = () => (reloading ? location.reload() : offer())

  const showPill = () => {
    if (pill) return
    pill = document.createElement('div')
    pill.className = 'toast update-toast'
    pill.setAttribute('role', 'status')
    const text = document.createElement('span')
    text.textContent = 'New version ready'
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Refresh'
    button.addEventListener('click', apply)
    pill.append(text, button)
    document.body.append(pill)
  }

  const offer = () => {
    pending = true
    if (isIdle()) apply()
    else showPill()
  }

  const hadController = !!navigator.serviceWorker.controller
  const updateSW = register({
    immediate: true,
    onNeedRefresh: offer,
    onNeedReload: switched,
    // Browsers only look for a new sw.js on navigation, and an installed app resumed from the
    // background never navigates, so it would keep serving the old precache. Check whenever the
    // app comes back to the foreground, and hourly while it stays open.
    onRegisteredSW(_url, r) {
      if (!r) return
      registration = r
      const check = () => {
        if (navigator.onLine && !r.installing) r.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, UPDATE_INTERVAL)
    },
  })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) switched()
  })
  // Pick a deferred update up once the drafts are gone and the app is put away or brought back.
  document.addEventListener('visibilitychange', () => {
    if (pending && isIdle()) apply()
  })
}
