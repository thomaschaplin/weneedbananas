import { useEffect, useState } from 'preact/hooks'
import { NameForm } from './NameForm'

const DISMISS_KEY = 'wnb:name-prompt'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'dismissed'
  } catch {
    return false
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'dismissed')
  } catch {
    /* ignore */
  }
}

/** Shop-mode card that makes it obvious who others see shopping, and lets you set your name in place. */
export function ShopIdentity({ name, onName }: { name: string; onName: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [dismissed, setDismissed] = useState(wasDismissed)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), 3000)
    return () => clearTimeout(t)
  }, [justSaved])

  const save = (n: string) => {
    onName(n)
    setEditing(false)
    setJustSaved(true)
    if (!n) {
      setDismissed(true)
      dismiss()
    }
  }

  if (editing || (!name && !dismissed)) {
    return (
      <section class="shop-id prompt" aria-label="Your name">
        <div class="shop-id-head">
          <p class="shop-id-title">
            <span aria-hidden="true">👋</span> Who's shopping?
          </p>
          <button
            type="button"
            class="link-btn small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setEditing(false)
              if (!name) {
                setDismissed(true)
                dismiss()
              }
            }}
          >
            {name ? 'Cancel' : 'Not now'}
          </button>
        </div>
        <p class="muted small">Add your name so everyone on this list can see it's you at the shop.</p>
        <NameForm name={name} onSave={save} autoFocus={editing} />
      </section>
    )
  }

  return (
    <div class="shop-id">
      <span aria-hidden="true">🛒</span>
      <span class="shop-id-who">
        {name ? (
          <>
            Shopping as <strong>{name}</strong>
          </>
        ) : (
          <span class="muted">Others see you as “Someone”</span>
        )}
      </span>
      {justSaved ? (
        <span class="saved-pill" role="status">
          ✓ Saved
        </span>
      ) : (
        <button type="button" class="link-btn" onClick={() => setEditing(true)}>
          {name ? 'Change' : 'Add your name'}
        </button>
      )}
    </div>
  )
}
