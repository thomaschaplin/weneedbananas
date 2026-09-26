import { registerSW as register } from 'virtual:pwa-register'

export function registerSW(): void {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) register({ immediate: true })
}
