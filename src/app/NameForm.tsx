import { useEffect, useRef, useState } from 'preact/hooks'

export const MAX_NAME = 24

/** Name input with an explicit Save that shows whether the name is saved. */
export function NameForm({
  name,
  onSave,
  autoFocus,
  label = 'Your name',
}: {
  name: string
  onSave: (n: string) => void
  autoFocus?: boolean
  label?: string
}) {
  const [draft, setDraft] = useState(name)
  const [saved, setSaved] = useState<null | string>(null)
  const input = useRef<HTMLInputElement>(null)
  const clean = draft.trim().slice(0, MAX_NAME)
  const dirty = clean !== name

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [])

  useEffect(() => {
    if (saved === null) return
    const t = setTimeout(() => setSaved(null), 3000)
    return () => clearTimeout(t)
  }, [saved])

  const save = () => {
    if (!dirty) return
    onSave(clean)
    setDraft(clean)
    setSaved(clean)
  }

  return (
    <form
      class="name-form"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div class="row">
        <input
          ref={input}
          type="text"
          value={draft}
          data-saved={dirty ? undefined : ''}
          maxLength={MAX_NAME}
          placeholder="e.g. Sam"
          autoComplete="given-name"
          enterKeyHint="done"
          aria-label={label}
          onInput={(e) => {
            setDraft((e.target as HTMLInputElement).value)
            setSaved(null)
          }}
          onBlur={save}
        />
        <button type="submit" class={`btn ${saved !== null && !dirty ? 'btn-saved' : 'btn-primary'}`} disabled={!dirty}>
          {saved !== null && !dirty ? '✓ Saved' : 'Save'}
        </button>
      </div>
      <p class={`name-status small${saved !== null ? ' ok' : ''}`} role="status" aria-live="polite">
        {saved !== null
          ? saved
            ? `Saved. Others on this list will see you as ${saved}.`
            : 'Name removed. You’ll show as “Someone”.'
          : dirty
            ? 'Not saved yet. Press Save or Enter.'
            : ''}
      </p>
    </form>
  )
}
