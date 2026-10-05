import { useRef, useState } from 'preact/hooks'

export type SwipeDir = 'left' | 'right'
export type Axis = 'pending' | 'x' | 'y'

/** Movement (px) before we decide whether a gesture is a horizontal swipe or a scroll. */
export const LOCK_SLOP = 10
/** Fraction of the row width a drag must pass to commit on release. */
export const THRESHOLD = 0.35
/** Release speed (px/ms) that commits a shorter flick. */
export const FLICK_VELOCITY = 0.6
/** A flick still has to travel this far (px), so a twitchy tap never counts. */
export const FLICK_MIN = 40

/**
 * Decide which way a gesture is going once it has moved past the slop.
 * Horizontal must clearly dominate; anything else is left to the page to scroll.
 */
export function lockAxis(dx: number, dy: number, slop = LOCK_SLOP): Axis {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < slop) return 'pending'
  return ax > ay * 1.2 ? 'x' : 'y'
}

/** Which action the drag would trigger if released now, ignoring velocity. */
export function armedDir(dx: number, width: number, threshold = THRESHOLD): SwipeDir | null {
  if (width <= 0 || Math.abs(dx) < width * threshold) return null
  return dx > 0 ? 'right' : 'left'
}

/** Outcome on release: past the threshold, or a fast flick in the same direction as the drag. */
export function swipeOutcome(dx: number, width: number, velocity: number): SwipeDir | null {
  const armed = armedDir(dx, width)
  if (armed) return armed
  if (Math.abs(dx) >= FLICK_MIN && Math.abs(velocity) >= FLICK_VELOCITY && Math.sign(velocity) === Math.sign(dx)) {
    return dx > 0 ? 'right' : 'left'
  }
  return null
}

/** Clamp the drag to directions that do something, with a little rubber band for the others. */
export function clampDx(dx: number, allowLeft: boolean, allowRight: boolean): number {
  if (dx < 0 && !allowLeft) return dx / 6
  if (dx > 0 && !allowRight) return dx / 6
  return dx
}

interface Track {
  id: number
  x0: number
  y0: number
  axis: Axis
  lastX: number
  lastT: number
  v: number
  width: number
  armed: SwipeDir | null
}

/**
 * Horizontal swipe on a row via Pointer Events. Vertical drags are abandoned so the
 * list still scrolls (pair with `touch-action: pan-y`), and a drag never turns into a click.
 */
export function useSwipe({
  onSwipe,
  onArm,
  allowLeft = true,
  allowRight = true,
}: {
  onSwipe: (dir: SwipeDir) => void
  onArm?: (dir: SwipeDir) => void
  allowLeft?: boolean
  allowRight?: boolean
}) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const track = useRef<Track | null>(null)
  const swallowClick = useRef(false)

  const reset = () => {
    track.current = null
    setDragging(false)
    setDx(0)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return
    swallowClick.current = false
    const el = e.currentTarget as HTMLElement
    track.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      axis: 'pending',
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      width: el.getBoundingClientRect().width,
      armed: null,
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const t = track.current
    if (!t || e.pointerId !== t.id) return
    const rawDx = e.clientX - t.x0
    if (t.axis === 'pending') {
      t.axis = lockAxis(rawDx, e.clientY - t.y0)
      if (t.axis === 'y') {
        track.current = null
        return
      }
      if (t.axis === 'pending') return
      const el = e.currentTarget as HTMLElement
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone */
      }
      setDragging(true)
    }
    const dt = e.timeStamp - t.lastT
    if (dt > 0) t.v = 0.6 * ((e.clientX - t.lastX) / dt) + 0.4 * t.v
    t.lastX = e.clientX
    t.lastT = e.timeStamp
    const next = clampDx(rawDx, allowLeft, allowRight)
    const armed = (next < 0 ? allowLeft : allowRight) ? armedDir(next, t.width) : null
    if (armed && armed !== t.armed) onArm?.(armed)
    t.armed = armed
    setDx(next)
    e.preventDefault()
  }

  const onPointerUp = (e: PointerEvent) => {
    const t = track.current
    if (!t || e.pointerId !== t.id) return
    if (t.axis !== 'x') {
      track.current = null
      return
    }
    // The click that follows this pointerup (if any) belongs to the drag, not the row.
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 300)
    const fin = clampDx(e.clientX - t.x0, allowLeft, allowRight)
    // A pause before letting go cancels the flick.
    const v = e.timeStamp - t.lastT > 100 ? 0 : t.v
    const out = swipeOutcome(fin, t.width, v)
    reset()
    if (out && (out === 'left' ? allowLeft : allowRight)) onSwipe(out)
  }

  const onPointerCancel = (e: PointerEvent) => {
    if (track.current && e.pointerId === track.current.id) reset()
  }

  const onClickCapture = (e: MouseEvent) => {
    if (!swallowClick.current) return
    swallowClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  return {
    dx,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture },
  }
}
