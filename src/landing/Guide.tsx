import type { ComponentChildren } from 'preact'
import { GUIDES, type Guide } from '../guides'
import { Page } from './Layout'

/** Shared frame for the use-case guide pages: article, FAQ, call to action and links to the other guides. */
export function GuidePage({
  guide,
  lede,
  children,
}: {
  guide: Guide
  lede: ComponentChildren
  children: ComponentChildren
}) {
  const others = GUIDES.filter((g) => g.path !== guide.path)
  return (
    <Page>
      <article class="prose">
        <h1>{guide.headline}</h1>
        <p class="lede">{lede}</p>
        {children}

        <p>
          <a class="btn btn-primary" href="/">
            Start a list
          </a>
        </p>

        <section class="faq" aria-labelledby="guide-faq-h">
          <h2 id="guide-faq-h">Questions</h2>
          {guide.faq.map((f) => (
            <details key={f.q}>
              <summary>
                <h3>{f.q}</h3>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <h2>Read more</h2>
        <ul>
          <li>
            <a href="/how-it-works">How a shared list works with no server</a>
          </li>
          {others.map((g) => (
            <li key={g.path}>
              <a href={g.path}>{g.headline}</a>
            </li>
          ))}
          <li>
            <a href="/privacy">Privacy: what we do and don't collect</a>
          </li>
        </ul>
      </article>
    </Page>
  )
}
