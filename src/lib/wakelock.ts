import { NATIVE } from './nav'

// Keep the screen on while shopping, re-acquiring after the tab comes back. The apps ask the OS
// instead, as app web views don't all have the Wake Lock API.
let sentinel: WakeLockSentinel | null = null
let wanted = false

async function acquire() {
  if (!wanted || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener('release', () => (sentinel = null))
  } catch {
    /* denied (e.g. low battery): not essential */
  }
}

document.addEventListener('visibilitychange', () => {
  if (wanted && !sentinel) void acquire()
})

export function keepAwake(on: boolean): void {
  wanted = on
  if (NATIVE) {
    void import('@capacitor-community/keep-awake')
      .then(({ KeepAwake }) => (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()))
      .catch(() => {})
    return
  }
  if (on) void acquire()
  else {
    void sentinel?.release()
    sentinel = null
  }
}

export function buzz(ms = 12): void {
  if (NATIVE) {
    // iOS web views can't vibrate.
    void import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {})
    return
  }
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}
