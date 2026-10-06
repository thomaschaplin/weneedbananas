import { useState } from 'preact/hooks'
import { AISLE_BY_ID } from '../lib/aisles'
import type { PasswordControls } from './ListApp'
import { NameForm } from './NameForm'
import { PasswordSection } from './Password'

export function MenuContent({
  name,
  onName,
  order,
  onOrder,
  onClearAll,
  onRemoveLocal,
  onMove,
  moving = false,
  moved = false,
  password,
  onPasswordDone,
  itemCount,
}: {
  name: string
  onName: (n: string) => void
  order: string[]
  onOrder: (o: string[]) => void
  onClearAll: () => void
  onRemoveLocal: () => void
  /** Move the list to new words. */
  onMove?: () => void
  moving?: boolean
  /** This list has already been moved away. */
  moved?: boolean
  /** Add, change or remove the list's password. */
  password?: PasswordControls
  onPasswordDone?: (message: string) => void
  itemCount: number
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmMove, setConfirmMove] = useState(false)

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
        <p class="muted small">
          Optional. Shown to everyone on this list when you're in “At the shop” mode. Stays on this device.
        </p>
        <NameForm name={name} onSave={onName} />
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

      {password && !moved && <PasswordSection controls={password} onDone={(m) => onPasswordDone?.(m)} />}

      <section>
        <h3>List</h3>
        <div class="stack">
          <button type="button" class="btn" disabled={itemCount === 0} onClick={onClearAll}>
            Clear every item
          </button>
          {password?.locked && !moved && (
            <p class="muted small">To shut people out of a list with a password, change the password.</p>
          )}
          {onMove &&
            !moved &&
            (confirmMove ? (
              <div class="confirm">
                <p>
                  Move this list to new words? A new private list is made with the same items, usuals and aisle order.
                  Everyone you want to keep on the list needs the new words. Anyone with the old words will only see
                  that the list has moved.
                </p>
                <div class="row">
                  <button type="button" class="btn btn-primary" disabled={moving} onClick={onMove}>
                    {moving ? 'Moving…' : 'Move'}
                  </button>
                  <button type="button" class="btn" disabled={moving} onClick={() => setConfirmMove(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" class="btn" onClick={() => setConfirmMove(true)}>
                Move to new words
              </button>
            ))}
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
