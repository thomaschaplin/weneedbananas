import { useState } from 'preact/hooks'
import { AISLE_BY_ID } from '../lib/aisles'
import type { AisleGroup, Item } from '../lib/doc'
import { ItemRow } from './ItemRow'

export function AisleSection({
  group,
  shopMode,
  onToggle,
  onEdit,
  onRemove,
}: {
  group: AisleGroup
  shopMode: boolean
  onToggle: (item: Item) => void
  onEdit: (item: Item) => void
  onRemove?: (item: Item) => void
}) {
  const aisle = AISLE_BY_ID[group.aisle] ?? AISLE_BY_ID.other
  const complete = group.todo.length === 0
  const [showDone, setShowDone] = useState(false)
  // In the shop, a finished aisle folds away so the next one is on screen.
  const doneVisible = !shopMode || !complete || showDone

  return (
    <section class={`aisle${complete ? ' complete' : ''}`} aria-label={aisle.label}>
      <h2 class="aisle-h">
        <span class="aisle-icon" aria-hidden="true">
          {aisle.icon}
        </span>
        <span class="aisle-label">{aisle.label}</span>
        <span class="aisle-count">
          {complete ? (
            shopMode ? (
              <button type="button" class="linkish" onClick={() => setShowDone(!showDone)}>
                ✓ all got {showDone ? '▴' : '▾'}
              </button>
            ) : (
              '✓'
            )
          ) : (
            group.todo.length
          )}
        </span>
      </h2>
      <ul class="items">
        {group.todo.map((it) => (
          <ItemRow key={it.id} item={it} shopMode={shopMode} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />
        ))}
        {doneVisible &&
          group.done.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              shopMode={shopMode}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
      </ul>
    </section>
  )
}
