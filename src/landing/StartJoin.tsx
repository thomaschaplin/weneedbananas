import { useEffect, useState } from 'preact/hooks'
import { generateSlug, parseSlugInput } from '../lib/slug'
import { recentLists, type RecentList } from '../lib/recent'

export function StartJoin() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<{ text: string; fix?: string; raw?: string } | null>(null)
  const [recent, setRecent] = useState<RecentList[]>([])

  // Recents live in this browser only, so they are filled in after hydration.
  useEffect(() => setRecent(recentLists()), [])

  const start = () => {
    location.href = `/${generateSlug()}`
  }

  const join = (e: Event) => {
    e.preventDefault()
    const r = parseSlugInput(value)
    if (r.ok) {
      location.href = `/${r.slug}`
      return
    }
    if (r.reason === 'count') {
      setError({ text: 'A list name is three words, like lemon.fork.bulb.' })
      return
    }
    const fixed = r.suggestions.every(Boolean) ? (r.suggestions as string[]).join('.') : undefined
    setError({
      text: fixed ? `Did you mean ${fixed}?` : `We don't recognise "${r.words.join('.')}".`,
      fix: fixed,
      raw: r.words.join('.'),
    })
  }

  return (
    <div class="startjoin">
      <button type="button" class="btn btn-primary btn-big" onClick={start}>
        Start a new list
      </button>
      <p class="or">or join one you've been sent</p>
      <form class="join" onSubmit={join}>
        <label for="join-words" class="sr-only">
          Three-word list name
        </label>
        <input
          id="join-words"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          spellcheck={false}
          placeholder="lemon.fork.bulb"
          value={value}
          onInput={(e) => {
            setValue((e.target as HTMLInputElement).value)
            setError(null)
          }}
        />
        <button type="submit" class="btn">
          Join
        </button>
      </form>
      {error && (
        <p class="join-error" role="alert">
          {error.text} {error.fix && <a href={`/${error.fix}`}>Yes, open it</a>}
          {error.raw && (
            <>
              {error.fix ? ' · ' : ''}
              <a href={`/${error.raw}`}>Open "{error.raw}" anyway</a>
            </>
          )}
        </p>
      )}
      {recent.length > 0 && (
        <div class="recent">
          <h2>Your lists on this device</h2>
          <ul>
            {recent.map((r) => (
              <li key={r.slug}>
                <a href={`/${r.slug}`}>
                  <span class="slug">{r.slug}</span>
                  <span class="muted">{r.todo ? `${r.todo} to get` : 'all done'}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
