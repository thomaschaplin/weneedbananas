import { useMemo, useRef, useState } from 'preact/hooks'
import { suggest, type HistoryEntry, type ListDoc } from '../lib/doc'
import { parseMany, type ParsedItem } from '../lib/parse'

export function AddBar({
  ld,
  version,
  onAdd,
  compact,
}: {
  ld: ListDoc
  version: number
  onAdd: (items: ParsedItem[]) => void
  compact: boolean
}) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const suggestions = useMemo<HistoryEntry[]>(() => {
    const last = text.split(/[,\n;]/).pop() ?? ''
    return last.trim().length >= 1 ? suggest(ld, last) : []
  }, [text, version])

  const submit = (raw: string) => {
    const items = parseMany(raw)
    if (!items.length) return
    onAdd(items)
    setText('')
    input.current?.focus()
  }

  const pick = (h: HistoryEntry) => {
    const parts = text.split(/([,\n;])/)
    parts[parts.length - 1] = h.name
    submit(parts.join(''))
  }

  return (
    <div class={`addbar${compact ? ' compact' : ''}`}>
      {suggestions.length > 0 && (
        <ul class="suggestions" aria-label="Suggestions">
          {suggestions.map((s) => (
            <li key={s.name}>
              <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => pick(s)}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(text)
        }}
      >
        <label for="add-input" class="sr-only">
          Add an item
        </label>
        <input
          id="add-input"
          ref={input}
          type="text"
          value={text}
          enterKeyHint="enter"
          autoComplete="off"
          autoCapitalize="sentences"
          placeholder={compact ? 'Remembered something?' : 'Add… e.g. 2 milk, 500g mince'}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          onPaste={(e) => {
            const pasted = e.clipboardData?.getData('text') ?? ''
            if (/[\n\r]/.test(pasted)) {
              e.preventDefault()
              submit(text + pasted)
            }
          }}
        />
        <button type="submit" class="btn btn-primary add-btn" aria-label="Add to list" disabled={!text.trim()}>
          +
        </button>
      </form>
    </div>
  )
}
