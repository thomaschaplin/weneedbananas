import { describe, expect, it } from 'vitest'
import { EXPIRY_DAYS, WARN_AFTER_DAYS, daysLeft, inDays, recentHint } from '../src/lib/expiry'
import { EXPIRY_SECONDS } from '../src/lib/mailbox'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 9, 5, 12)

describe('expiry', () => {
  it('matches what the mailbox tags its events with', () => {
    expect(EXPIRY_SECONDS * 1000).toBe(EXPIRY_DAYS * DAY)
    expect(WARN_AFTER_DAYS).toBeLessThan(EXPIRY_DAYS)
  })

  it('counts whole days left, rounding up and never below zero', () => {
    expect(daysLeft(now + 30 * DAY, now)).toBe(30)
    expect(daysLeft(now + 4.2 * DAY, now)).toBe(5)
    expect(daysLeft(now + 1000, now)).toBe(1)
    expect(daysLeft(now, now)).toBe(0)
    expect(daysLeft(now - 3 * DAY, now)).toBe(0)
  })

  it('says when in words', () => {
    expect(inDays(0)).toBe('today')
    expect(inDays(1)).toBe('tomorrow')
    expect(inDays(12)).toBe('in 12 days')
  })

  it('leaves recently opened lists alone', () => {
    expect(recentHint(now, now)).toBeNull()
    expect(recentHint(now - 24.9 * DAY, now)).toBeNull()
  })

  it('nudges once a list has not been opened here for 25 days', () => {
    expect(recentHint(now - 25 * DAY, now)).toBe('Open to keep it safe · 5 days left')
    expect(recentHint(now - 29.5 * DAY, now)).toBe('Open to keep it safe · 1 day left')
    expect(recentHint(now - 40 * DAY, now)).toBe('Open to keep it safe')
  })

  it('ignores missing timestamps', () => {
    expect(recentHint(0, now)).toBeNull()
  })
})
