import { useState } from 'preact/hooks'
import { AISLES } from '../lib/aisles'
import type { Item } from '../lib/doc'

export interface EditActions {
  save: (id: string, patch: { name: string; qty: number | null; unit: string | null; note: string | null }) => void
  setAisle: (id: string, aisle: string) => void
  setMissing: (id: string, missing: boolean) => void
  remove: (id: string) => void
}

export function EditForm({ item, actions, close }: { item: Item; actions: EditActions; close: () => void }) {
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState<number | null>(item.qty)
  const [note, setNote] = useState(item.note ?? '')
  const step = item.unit && /^(g|ml)$/.test(item.unit) ? 100 : 1

  const save = (e: Event) => {
    e.preventDefault()
    if (!name.trim()) return
    actions.save(item.id, { name: name.trim(), qty, unit: item.unit, note: note.trim() || null })
    close()
  }

  return (
    <form class="edit" onSubmit={save}>
      <label>
        <span>Item</span>
        <input type="text" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>

      <div class="field">
        <span>How many{item.unit ? ` (${item.unit})` : ''}</span>
        <div class="stepper">
          <button
            type="button"
            aria-label="Fewer"
            onClick={() => setQty((q) => (q === null || q - step <= 0 ? null : q - step))}
          >
            −
          </button>
          <output aria-live="polite">{qty ?? '–'}</output>
          <button type="button" aria-label="More" onClick={() => setQty((q) => (q ?? 0) + step)}>
            +
          </button>
        </div>
      </div>

      <label>
        <span>Note</span>
        <input
          type="text"
          value={note}
          placeholder="brand, size, 'only if on offer'…"
          onInput={(e) => setNote((e.target as HTMLInputElement).value)}
        />
      </label>

      <div class="field">
        <span>Aisle</span>
        <div class="aisle-picker" role="radiogroup" aria-label="Aisle">
          {AISLES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={item.aisle === a.id}
              class={item.aisle === a.id ? 'on' : ''}
              onClick={() => {
                actions.setAisle(item.id, a.id)
                close()
              }}
            >
              <span aria-hidden="true">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
        <small class="muted">We'll remember this for "{item.name}" on this list.</small>
      </div>

      <div class="edit-actions">
        <button type="submit" class="btn btn-primary">
          Save
        </button>
        <button
          type="button"
          class="btn"
          onClick={() => {
            actions.setMissing(item.id, !item.missing)
            close()
          }}
        >
          {item.missing ? 'Found it after all' : "Couldn't find it"}
        </button>
        <button
          type="button"
          class="btn btn-danger"
          onClick={() => {
            actions.remove(item.id)
            close()
          }}
        >
          Remove
        </button>
      </div>
    </form>
  )
}
