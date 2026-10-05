import { registerSW as register } from 'virtual:pwa-register'

const UPDATE_INTERVAL = 60 * 60 * 1000

export function registerSW(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  register({
    immediate: true,
    // Browsers only look for a new sw.js on navigation, and an installed app resumed from the
    // background never navigates, so it would keep serving the old precache. Check whenever the
    // app comes back to the foreground, and hourly while it stays open. A new worker activates
    // and reloads the page (registerType: 'autoUpdate').
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine && !registration.installing) registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, UPDATE_INTERVAL)
    },
  })
}
