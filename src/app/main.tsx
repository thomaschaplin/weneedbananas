import { render } from 'preact'
import '../styles.css'
import { initAnalytics } from '../lib/analytics'
import { SLUG_RE } from '../lib/slug'
import { registerSW } from '../sw'
import { ListApp } from './ListApp'

const raw = decodeURIComponent(location.pathname.slice(1)).replace(/\/$/, '')
const slug = raw.toLowerCase()

if (!SLUG_RE.test(slug)) {
  location.replace('/')
} else {
  if (raw !== slug) history.replaceState(null, '', `/${slug}`)
  document.title = `${slug} · We Need Bananas`
  render(<ListApp slug={slug} />, document.getElementById('app')!)
  registerSW()
  initAnalytics()
}
