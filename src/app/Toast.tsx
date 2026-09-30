import { useEffect } from 'preact/hooks'

export interface ToastData {
  id: number
  text: string
  undo?: () => void
}

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, toast.undo ? 6000 : 2500)
    return () => clearTimeout(t)
  }, [toast?.id])

  if (!toast) return null
  return (
    <div class="toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo!()
            onDone()
          }}
        >
          Undo
        </button>
      )}
    </div>
  )
}
