import { describe, expect, it } from 'vitest'
import { redactUrl } from '../src/lib/analytics'

describe('redactUrl', () => {
  it('hides list words', () => {
    expect(redactUrl('https://weneedbananas.com/lemon.fork.bulb')).toBe('https://weneedbananas.com/list')
    expect(redactUrl('https://weneedbananas.com/Lemon.Fork.Bulb/?x=1#y')).toBe('https://weneedbananas.com/list')
  })

  it('keeps other pages but drops query and hash', () => {
    expect(redactUrl('https://weneedbananas.com/')).toBe('https://weneedbananas.com/')
    expect(redactUrl('https://weneedbananas.com/privacy?ref=x#top')).toBe('https://weneedbananas.com/privacy')
  })

  it('replaces the whole path when told to', () => {
    expect(redactUrl('https://weneedbananas.com/lemon/fork/bulb?x=1', '/404')).toBe('https://weneedbananas.com/404')
  })
})
