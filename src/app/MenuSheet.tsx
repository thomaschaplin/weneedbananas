import { useState } from 'preact/hooks'
import { AISLE_BY_ID } from '../lib/aisles'

export function MenuContent({
  name,
  onName,
  order,
  onOrder,
  onClearAll,
  onRemoveLocal,
  itemCount,
}: {
  name: string
  onName: (n: string) => void
  order: string[]
  onOrder: (o: string[]) => void
  onClearAll: () => void
  onRemoveLocal: () => void
  itemCount: number
}) {
  const [draft, setDraft] = useState(name)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    onOrder(next)
  }

  return (
    <div class="menu">
      <section>
        <h3>Your name</h3>
        <p class="muted small">Optional. Shown to others on this list when you're at the shop. Stays on this device.</p>
        <form
          class="row"
          onSubmit={(e) => {
            e.preventDefault()
            onName(draft)
          }}
        >
          <input
            type="text"
            value={draft}
            maxLength={24}
            placeholder="e.g. Sam"
            onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
            onBlur={() => onName(draft)}
          />
          <button type="submit" class="btn">
            Save
          </button>
        </form>
      </section>

      <section>
        <h3>Aisle order</h3>
        <p class="muted small">Match the way you walk round your shop. Shared with everyone on this list.</p>
        <ol class="aisle-order">
          {order.map((id, i) => {
            const a = AISLE_BY_ID[id]
            return (
              <li key={id}>
                <span>
                  <span aria-hidden="true">{a.icon}</span> {a.label}
                </span>
                <span class="row">
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={`Move ${a.label} earlier`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="icon-btn"
                    aria-label={`Move ${a.label} later`}
                    disabled={i === order.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section>
        <h3>List</h3>
        <div class="stack">
          <button type="button" class="btn" disabled={itemCount === 0} onClick={onClearAll}>
            Clear every item
          </button>
          {confirmRemove ? (
            <div class="confirm">
              <p>
                Remove this list from this device? Other devices keep their copy. If this is the only device, the list
                is gone for good.
              </p>
              <div class="row">
                <button type="button" class="btn btn-danger" onClick={onRemoveLocal}>
                  Remove
                </button>
                <button type="button" class="btn" onClick={() => setConfirmRemove(false)}>
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <button type="button" class="btn btn-danger" onClick={() => setConfirmRemove(true)}>
              Remove from this device
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
