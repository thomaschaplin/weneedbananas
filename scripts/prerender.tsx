// Runs at the end of `vite build` (the wnb-prerender plugin), before the service worker is
// generated: renders the static pages to HTML so crawlers and answer engines get real content,
// and injects structured data.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ComponentType } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { FAQ, SITE } from '../src/content'
import { HowItWorks } from '../src/landing/HowItWorks'
import { Landing } from '../src/landing/Landing'
import { NotFound } from '../src/landing/NotFound'
import { Offline } from '../src/landing/Offline'
import { Privacy } from '../src/landing/Privacy'

const dist = resolve(import.meta.dirname, '../dist')

const website = {
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: `${SITE.url}/`,
  name: SITE.name,
  description: SITE.description,
  inLanguage: 'en',
}

const app = {
  '@type': 'WebApplication',
  '@id': `${SITE.url}/#app`,
  name: SITE.name,
  url: `${SITE.url}/`,
  description: SITE.description,
  applicationCategory: 'ShoppingApplication',
  operatingSystem: 'Any (runs in the browser)',
  browserRequirements: 'Requires JavaScript and a modern browser with WebRTC.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
  featureList: [
    'Shared shopping list with no signup or email',
    'Lists named with three random words',
    'Automatic sorting by supermarket aisle',
    'Understands quantities like "2 milk" or "500g mince"',
    'Shop mode with screen wake lock and large tick targets',
    'Works offline',
    'Peer-to-peer sync with no server storing lists',
  ],
}

const faqPage = {
  '@type': 'FAQPage',
  '@id': `${SITE.url}/#faq`,
  mainEntity: FAQ.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

function article(path: string, headline: string, description: string) {
  return {
    '@type': 'Article',
    headline,
    description,
    url: `${SITE.url}${path}`,
    isPartOf: { '@id': `${SITE.url}/#website` },
    publisher: { '@type': 'Organization', name: SITE.name, url: `${SITE.url}/` },
  }
}

function breadcrumb(path: string, name: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE.url}${path}` },
    ],
  }
}

const pages: { file: string; Component: ComponentType; graph: object[] }[] = [
  { file: 'index.html', Component: Landing, graph: [website, app, faqPage] },
  {
    file: 'how-it-works.html',
    Component: HowItWorks,
    graph: [
      website,
      article(
        '/how-it-works',
        'How a shared shopping list works with no server',
        'Three words, peer-to-peer WebRTC sync and a CRDT keep a shopping list in sync between phones without accounts or a database.',
      ),
      breadcrumb('/how-it-works', 'How it works'),
    ],
  },
  {
    file: 'privacy.html',
    Component: Privacy,
    graph: [website, breadcrumb('/privacy', 'Privacy')],
  },
  // Error pages are noindex and carry no structured data.
  { file: '404.html', Component: NotFound, graph: [] },
  { file: 'offline.html', Component: Offline, graph: [] },
]

for (const { file, Component, graph } of pages) {
  const path = resolve(dist, file)
  let html = readFileSync(path, 'utf8')
  if (!html.includes('<!--app-->')) throw new Error(`${file}: missing <!--app--> marker`)
  const body = renderToString(<Component />)
  const jsonld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  html = html
    .replace('<!--app-->', body)
    .replace('<!--jsonld-->', `<script type="application/ld+json">${jsonld}</script>`)
  writeFileSync(path, html)
  console.log(`prerendered ${file} (${(body.length / 1024).toFixed(1)} kB)`)
}
