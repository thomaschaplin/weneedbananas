import { render } from 'preact'
import '../styles.css'
import { initAnalytics } from '../lib/analytics'
import { sharedText } from '../lib/export'
import { listUrl, NATIVE, pageUrl, routeFrom } from '../lib/nav'
import { SLUG_RE } from '../lib/slug'
import { registerSW } from '../sw'
import { ListRoute } from './ListRoute'
import { ShareTarget } from './ShareTarget'

const raw = routeFrom(location)
const slug = raw.toLowerCase()

// Text shared into the app, or handed over to a list: read it, then drop it from the address bar
// before analytics loads, so it never leaves the device.
const params = new URLSearchParams(location.search)
const prefill = new URLSearchParams(location.hash.slice(1)).get('add') ?? undefined

if (raw === 'share-target') {
  const text = sharedText(params.get('title'), params.get('text'))
  history.replaceState(null, '', NATIVE ? '/list.html?l=share-target' : '/share-target')
  document.title = 'Add to a list · We Need Bananas'
  render(<ShareTarget text={text} />, document.getElementById('app')!)
  registerSW()
  initAnalytics()
} else if (!SLUG_RE.test(slug)) {
  location.replace(pageUrl(''))
} else {
  if (raw !== slug || prefill !== undefined) history.replaceState(null, '', listUrl(slug))
  document.title = `${slug} · We Need Bananas`
  render(<ListRoute slug={slug} prefill={prefill} />, document.getElementById('app')!)
  registerSW()
  initAnalytics()
}
