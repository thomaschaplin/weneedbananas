import { useState } from 'preact/hooks'
import { MIN_PASSWORD } from '../lib/lock'
import { cancelled, NoPrfError } from '../lib/passkey'
import { BananaMark } from '../landing/Logo'
import { ThemeToggle } from '../landing/ThemeToggle'
import type { PasskeyControls, PasswordControls } from './ListApp'

const passkeyErrorText = (e: unknown) => passkeyError(e, "Couldn't use a passkey. Type the password instead.")

/** What to say when a passkey couldn't be used. */
function passkeyError(e: unknown, fallback: string): string {
  // Also what a browser says when it refuses the request, so it's never silent.
  if (cancelled(e)) return 'No passkey was used. Try again.'
  if (e instanceof NoPrfError) return "This device's passkeys can't unlock lists yet."
  return fallback
}

/** Adding passkeys to a list with a password, so it opens without typing the password. */
function PasskeySection({ controls, onDone }: { controls: PasskeyControls; onDone: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const n = controls.count

  const act = async (work: () => Promise<void>, done: string, failed: string) => {
    setBusy(true)
    setError('')
    try {
      await work()
      onDone(done)
    } catch (e) {
      setError(passkeyError(e, failed))
    }
    setBusy(false)
    setConfirm(false)
  }

  return (
    <div class="stack passkeys">
      <p class="muted small">
        Add a passkey to open this list on your own devices without typing the password: it works wherever the passkey
        syncs, like iCloud Keychain or Google Password Manager. Each person adds their own.
        {n > 0 && ` ${n === 1 ? 'One passkey has' : `${n} passkeys have`} been added.`}
      </p>
      {confirm ? (
        <div class="confirm">
          <p>Remove every passkey from this list? Everyone who used one types the password again on a new device.</p>
          <div class="row">
            <button
              type="button"
              class="btn btn-danger"
              disabled={busy}
              onClick={() => act(controls.removeAll, 'Passkeys removed.', "Couldn't remove the passkeys. Try again.")}
            >
              {busy ? 'Removing…' : 'Remove passkeys'}
            </button>
            <button type="button" class="btn" disabled={busy} onClick={() => setConfirm(false)}>
              Keep them
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            class="btn"
            disabled={busy}
            onClick={() =>
              act(
                controls.add,
                'Passkey added. Use it to unlock this list on any device it syncs to.',
                "Couldn't add a passkey. Try again.",
              )
            }
          >
            {busy ? 'Adding…' : 'Add a passkey'}
          </button>
          {n > 0 && (
            <button type="button" class="btn" disabled={busy} onClick={() => setConfirm(true)}>
              Remove passkeys
            </button>
          )}
        </>
      )}
      {error && (
        <p class="password-error small" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

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
          🔒 This list has a password. Each device needs the words and the password once, then remembers it. To make
          this device forget it, and its copy of the list, lock the list here; type the password to unlock it.
        </p>
      ) : (
        <p class="muted small">
          Optional. With a password, the three words alone no longer open the list. Everyone on it types the password
          once on each device. Share it separately from the words, and pick one that's hard to guess.
        </p>
      )}
      {mode === null && controls.passkeys && <PasskeySection controls={controls.passkeys} onDone={onDone} />}
      {mode === 'set' ? (
        <NewPasswordForm
          submitLabel={controls.locked ? 'Change password' : 'Add password'}
          onCancel={() => setMode(null)}
          onSubmit={async (pw) => {
            const changing = controls.locked
            const hadPasskeys = (controls.passkeys?.count ?? 0) > 0
            await controls.set(pw)
            setMode(null)
            onDone(
              changing
                ? `Password changed. Everyone else on the list needs the new one${hadPasskeys ? ', and passkeys need adding again' : ''}.`
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
          {controls.lockDevice && (
            <button
              type="button"
              class="btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                try {
                  await controls.lockDevice?.()
                } catch {
                  setError("Couldn't save your latest changes, so the list is still unlocked. Try again when online.")
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Locking…' : 'Lock on this device'}
            </button>
          )}
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

/** new: never opened here. changed: the password this device had stopped working. locked: locked here on purpose. */
export type PromptReason = 'new' | 'changed' | 'locked'

const PROMPT_TEXT: Record<PromptReason, string> = {
  new: 'Ask whoever shared the list for the password. This device remembers it after the first time.',
  changed: 'The password has changed since this device last opened the list. Ask whoever changed it for the new one.',
  locked:
    "Locked on this device. Nothing from the list is kept here until it's unlocked; it comes back from the other devices and relays when you type the password.",
}

/** Shown in place of a list that has a password this device doesn't know (yet). */
export function PasswordPrompt({
  slug,
  reason,
  onSubmit,
  onPasskey,
}: {
  slug: string
  reason: PromptReason
  /** Resolves true if the password opened the list. */
  onSubmit: (password: string) => Promise<boolean>
  /** Resolves true if a passkey opened the list. Only when passkeys have been added to it. */
  onPasskey?: () => Promise<boolean>
}) {
  const [pw, setPw] = useState('')
  const [checking, setChecking] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')

  const usePasskey = async () => {
    if (!onPasskey || checking) return
    setChecking(true)
    setWrong(false)
    setPasskeyError('')
    try {
      if (await onPasskey()) return
      setPasskeyError("That passkey doesn't open this list any more. Type the password instead.")
    } catch (e) {
      setPasskeyError(passkeyErrorText(e))
    }
    setChecking(false)
  }

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
          <p class="empty-title">{reason === 'locked' ? '🔒 This list is locked' : '🔒 This list has a password'}</p>
          <p>{PROMPT_TEXT[reason]}</p>
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
              {checking ? 'Checking…' : reason === 'locked' ? 'Unlock' : 'Open list'}
            </button>
            {onPasskey && (
              <button type="button" class="btn" disabled={checking} onClick={usePasskey}>
                Unlock with a passkey
              </button>
            )}
            {passkeyError && (
              <p class="password-error small" role="alert">
                {passkeyError}
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
