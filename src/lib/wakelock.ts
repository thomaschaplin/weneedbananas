// Keep the screen on while shopping, re-acquiring after the tab comes back.
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
  if (on) void acquire()
  else {
    void sentinel?.release()
    sentinel = null
  }
}

export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}
