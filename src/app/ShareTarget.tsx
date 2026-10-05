import { useMemo } from 'preact/hooks'
import { BananaMark } from '../landing/Logo'
import { toAddBarText } from '../lib/export'
import { parseMany } from '../lib/parse'
import { recentLists } from '../lib/recent'
import { generateSlug } from '../lib/slug'

/** Where to open a list with shared text waiting in its add bar. The hash never reaches a server or analytics. */
export function listHref(slug: string, text: string): string {
  const line = toAddBarText(text)
  return line ? `/${slug}#add=${encodeURIComponent(line)}` : `/${slug}`
}

/** Landing page for the Web Share Target: pick which list the shared text goes on. */
export function ShareTarget({ text }: { text: string }) {
  const recent = useMemo(recentLists, [])
  const count = useMemo(() => parseMany(text).length, [text])

  return (
    <main class="share-target">
      <a href="/" class="home" aria-label="We Need Bananas home">
        <BananaMark size={34} />
      </a>
      {count ? (
        <>
          <h1>Add to which list?</h1>
          <p class="muted">
            {count} item{count === 1 ? '' : 's'} to check before adding:
          </p>
          <pre class="share-target-preview">{text}</pre>
        </>
      ) : (
        <>
          <h1>Nothing to add</h1>
          <p class="muted">No list items came through. You can still open a list and type them in.</p>
        </>
      )}
      <button
        type="button"
        class="btn btn-primary btn-big"
        onClick={() => (location.href = listHref(generateSlug(), text))}
      >
        Start a new list
      </button>
      {recent.length > 0 && (
        <div class="recent">
          <h2>Your lists on this device</h2>
          <ul>
            {recent.map((r) => (
              <li key={r.slug}>
                <a href={listHref(r.slug, text)}>
                  <span class="slug">{r.slug}</span>
                  <span class="muted">{r.todo ? `${r.todo} to get` : 'all done'}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
