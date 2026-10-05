import { describe, expect, it } from 'vitest'
import { armedDir, clampDx, FLICK_MIN, lockAxis, swipeOutcome } from '../src/app/useSwipe'

describe('lockAxis', () => {
  it('waits until the pointer has moved past the slop', () => {
    expect(lockAxis(0, 0)).toBe('pending')
    expect(lockAxis(6, -5)).toBe('pending')
  })

  it('locks horizontal only when it clearly dominates', () => {
    expect(lockAxis(20, 3)).toBe('x')
    expect(lockAxis(-20, 3)).toBe('x')
    expect(lockAxis(12, 11)).toBe('y')
    expect(lockAxis(3, 20)).toBe('y')
    expect(lockAxis(-2, -15)).toBe('y')
  })
})

describe('armedDir', () => {
  it('arms past 35% of the row width', () => {
    expect(armedDir(100, 300)).toBeNull()
    expect(armedDir(106, 300)).toBe('right')
    expect(armedDir(-106, 300)).toBe('left')
  })

  it('never arms without a width', () => {
    expect(armedDir(500, 0)).toBeNull()
  })
})

describe('swipeOutcome', () => {
  it('commits past the threshold whatever the speed', () => {
    expect(swipeOutcome(150, 300, 0)).toBe('right')
    expect(swipeOutcome(-150, 300, 0.2)).toBe('left')
  })

  it('springs back below the threshold when slow', () => {
    expect(swipeOutcome(80, 300, 0.1)).toBeNull()
    expect(swipeOutcome(-80, 300, -0.1)).toBeNull()
  })

  it('commits a fast flick in the direction of travel', () => {
    expect(swipeOutcome(60, 300, 1.2)).toBe('right')
    expect(swipeOutcome(-60, 300, -1.2)).toBe('left')
  })

  it('ignores a flick back towards the start or a tiny twitch', () => {
    expect(swipeOutcome(80, 300, -1.2)).toBeNull()
    expect(swipeOutcome(FLICK_MIN - 1, 300, 2)).toBeNull()
  })
})

describe('clampDx', () => {
  it('passes allowed directions through and rubber-bands the rest', () => {
    expect(clampDx(60, true, true)).toBe(60)
    expect(clampDx(-60, false, true)).toBe(-10)
    expect(clampDx(60, true, false)).toBe(10)
  })
})
