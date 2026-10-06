import { useState } from 'preact/hooks'
import { MIN_PASSWORD } from '../lib/lock'
import { BananaMark } from '../landing/Logo'
import { ThemeToggle } from '../landing/ThemeToggle'
import type { PasswordControls } from './ListApp'

/** New password, typed twice. */
function NewPasswordForm({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string
  onSubmit: (password: string) => Promise<void>
  onCancel: () => void
}) {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: Event) => {
    e.preventDefault()
    if (pw.trim().length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    if (pw !== again) return setError("The two passwords don't match.")
    setError('')
    setBusy(true)
    try {
      await onSubmit(pw)
    } catch {
      setError("Couldn't save the password. Try again.")
      setBusy(false)
    }
  }

  return (
    <form class="confirm stack password-form" onSubmit={submit}>
      <input
        type="password"
        aria-label="New password"
        placeholder="New password"
        autoComplete="new-password"
        value={pw}
        disabled={busy}
        onInput={(e) => setPw((e.target as HTMLInputElement).value)}
      />
      <input
        type="password"
        aria-label="Type it again"
        placeholder="Type it again"
        autoComplete="new-password"
        value={again}
        disabled={busy}
        onInput={(e) => setAgain((e.target as HTMLInputElement).value)}
      />
      {error && (
        <p class="password-error small" role="alert">
          {error}
        </p>
      )}
      <div class="row">
        <button type="submit" class="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" class="btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/** The Password part of list settings. */
export function PasswordSection({
  controls,
  onDone,
}: {
  controls: PasswordControls
  onDone: (message: string) => void
}) {
  const [mode, setMode] = useState<null | 'set' | 'remove'>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await controls.remove()
      onDone('Password removed. The three words are enough to open the list again.')
    } catch {
      setError("Couldn't remove the password. Try again.")
    }
    setBusy(false)
    setMode(null)
  }

  return (
    <section>
      <h3>Password</h3>
      {controls.locked ? (
        <p class="muted small">
          🔒 This list has a password. Each device needs the words and the password once, then remembers it.
        </p>
      ) : (
        <p class="muted small">
          Optional. With a password, the three words alone no longer open the list. Everyone on it types the password
          once on each device. Share it separately from the words, and pick one that's hard to guess.
        </p>
      )}
      {mode === 'set' ? (
        <NewPasswordForm
          submitLabel={controls.locked ? 'Change password' : 'Add password'}
          onCancel={() => setMode(null)}
          onSubmit={async (pw) => {
            const changing = controls.locked
            await controls.set(pw)
            setMode(null)
            onDone(
              changing
                ? 'Password changed. Everyone else on the list needs the new one.'
                : 'Password added. Share it with everyone on the list.',
            )
          }}
        />
      ) : mode === 'remove' ? (
        <div class="confirm">
          <p>Remove the password? Anyone with the three words will be able to open the list again.</p>
          <div class="row">
            <button type="button" class="btn btn-danger" disabled={busy} onClick={remove}>
              {busy ? 'Removing…' : 'Remove password'}
            </button>
            <button type="button" class="btn" disabled={busy} onClick={() => setMode(null)}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div class="stack">
          <button type="button" class="btn" onClick={() => setMode('set')}>
            {controls.locked ? 'Change password' : 'Add a password'}
          </button>
          {controls.locked && (
            <button type="button" class="btn" onClick={() => setMode('remove')}>
              Remove password
            </button>
          )}
        </div>
      )}
      {error && (
        <p class="password-error small" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

/** Shown in place of a list that has a password this device doesn't know (yet). */
export function PasswordPrompt({
  slug,
  changed,
  onSubmit,
}: {
  slug: string
  /** This device had a password for the list and it no longer works. */
  changed: boolean
  /** Resolves true if the password opened the list. */
  onSubmit: (password: string) => Promise<boolean>
}) {
  const [pw, setPw] = useState('')
  const [checking, setChecking] = useState(false)
  const [wrong, setWrong] = useState(false)

  const submit = async (e: Event) => {
    e.preventDefault()
    if (!pw.trim() || checking) return
    setChecking(true)
    setWrong(false)
    const ok = await onSubmit(pw)
    if (!ok) {
      setWrong(true)
      setChecking(false)
    }
  }

  return (
    <div class="app">
      <header class="app-header">
        <a href="/" class="home" aria-label="We Need Bananas home">
          <BananaMark size={34} />
        </a>
        <span class="slug-btn">
          <span class="slug">{slug}</span>
        </span>
        <ThemeToggle />
      </header>
      <main class="list">
        <form class="empty unlock" onSubmit={submit}>
          <p class="empty-title">🔒 This list has a password</p>
          <p>
            {changed
              ? 'The password has changed since this device last opened the list. Ask whoever changed it for the new one.'
              : 'Ask whoever shared the list for the password. This device remembers it after the first time.'}
          </p>
          <div class="stack">
            <input
              type="password"
              aria-label="Password"
              placeholder="Password"
              autoComplete="current-password"
              autoFocus
              value={pw}
              onInput={(e) => setPw((e.target as HTMLInputElement).value)}
            />
            {wrong && (
              <p class="password-error small" role="alert">
                That password doesn't open this list.
              </p>
            )}
            <button type="submit" class="btn btn-primary" disabled={checking}>
              {checking ? 'Checking…' : 'Open list'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
