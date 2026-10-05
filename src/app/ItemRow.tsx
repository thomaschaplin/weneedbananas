import type { Item } from '../lib/doc'
import { formatQty } from '../lib/parse'
import { buzz } from '../lib/wakelock'
import { useSwipe } from './useSwipe'

export function ItemRow({
  item,
  shopMode,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: Item
  shopMode: boolean
  onToggle: (item: Item) => void
  onEdit: (item: Item) => void
  onRemove?: (item: Item) => void
}) {
  const qty = formatQty(item.qty, item.unit)
  // Swipe right to tick/untick, left to remove: a touch shortcut for the buttons below.
  const swipe = useSwipe({
    onSwipe: (dir) => (dir === 'right' ? onToggle(item) : onRemove?.(item)),
    onArm: () => buzz(),
    allowLeft: !!onRemove,
  })
  const side = swipe.dx > 0 ? 'right' : swipe.dx < 0 ? 'left' : ''
  const cls = ['item', item.done && 'done', item.missing && 'missing', swipe.dragging && 'swiping']
    .filter(Boolean)
    .join(' ')
  return (
    <li class={cls} {...swipe.handlers}>
      {side && (
        <div class={`swipe-bg swipe-${side}`} aria-hidden="true">
          {side === 'right' ? (item.done ? '↺ Put back' : '✓ Got it') : '🗑 Remove'}
        </div>
      )}
      <div class="item-fg" style={swipe.dx ? { transform: `translateX(${swipe.dx}px)` } : undefined}>
        <button
          type="button"
          class="tick"
          aria-pressed={item.done}
          aria-label={item.done ? `Put ${item.name} back on the list` : `Got ${item.name}`}
          onClick={() => onToggle(item)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </button>
        <button
          type="button"
          class="item-main"
          onClick={() => (shopMode ? onToggle(item) : onEdit(item))}
          aria-label={shopMode ? undefined : `Edit ${item.name}`}
        >
          <span class="item-name">
            {qty && <span class="qty">{qty}</span>}
            {item.name}
          </span>
          {(item.note || item.missing) && (
            <span class="item-sub">
              {item.missing && <span class="tag">couldn't find last time</span>}
              {item.note}
            </span>
          )}
        </button>
        {shopMode && (
          <button
            type="button"
            class="icon-btn more"
            aria-label={`Options for ${item.name}`}
            onClick={() => onEdit(item)}
          >
            ⋯
          </button>
        )}
      </div>
    </li>
  )
}
