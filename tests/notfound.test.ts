import { describe, expect, it } from 'vitest'
import { guessList } from '../src/landing/NotFound'

describe('guessList', () => {
  it('finds a list written with the wrong separators', () => {
    expect(guessList('/lemon-fork-bulb')).toBe('lemon.fork.bulb')
    expect(guessList('/lemon/fork/bulb/')).toBe('lemon.fork.bulb')
  })

  it('fixes typos in a list-shaped path', () => {
    expect(guessList('/lemon.fork.bulbb')).toBe('lemon.fork.bulb')
  })

  it('leaves ordinary missing pages alone', () => {
    expect(guessList('/about')).toBeNull()
    expect(guessList('/about-us-page')).toBeNull()
    expect(guessList('/%E0%A4%A')).toBeNull()
  })
})
