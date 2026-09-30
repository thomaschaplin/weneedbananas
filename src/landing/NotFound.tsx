import { useEffect, useState } from 'preact/hooks'
import { parseSlugInput } from '../lib/slug'
import { Page } from './Layout'
import { StartJoin } from './StartJoin'

/** If the missing path looks like a mistyped list name, find the list they meant. */
export function guessList(pathname: string): string | null {
  let path: string
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const r = parseSlugInput(path)
  if (r.ok) return r.slug
  // Only offer typo fixes for paths written like a list, so /about-us isn't "fixed" into three random words.
  if (r.reason === 'unknown' && /^\/?[^/.]+\.[^/.]+\.[^/.]+\/?$/.test(path) && r.suggestions.every(Boolean)) {
    return r.suggestions.join('.')
  }
  return null
}

export function NotFound() {
  const [guess, setGuess] = useState<string | null>(null)

  // The path is only known in the browser, so the hint is filled in after hydration.
  useEffect(() => setGuess(guessList(location.pathname)), [])

  return (
    <Page>
      <section class="prose error-page">
        <p class="eyebrow">404 · page not found</p>
        <h1>We looked in every aisle.</h1>
        <p class="lede">
          There's nothing at this address. If someone sent you a list, check the three words, like{' '}
          <code>lemon.fork.bulb</code>.
        </p>
        {guess && (
          <p class="error-hint" role="status">
            Looking for the list <a href={`/${guess}`}>{guess}</a>?
          </p>
        )}
        <StartJoin />
      </section>
    </Page>
  )
}
