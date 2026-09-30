import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

/** Bottom sheet built on <dialog> for focus trapping and Esc-to-close. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ComponentChildren
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      class="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // Tap on the backdrop closes.
        if (e.target === ref.current) onClose()
      }}
    >
      <div class="sheet-inner">
        <div class="sheet-head">
          <h2>{title}</h2>
          <button type="button" class="icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  )
}
