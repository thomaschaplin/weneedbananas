import { hydrate } from 'preact'
import '../styles.css'
import { initAnalytics } from '../lib/analytics'
import { registerSW } from '../sw'
import { NotFound } from './NotFound'

hydrate(<NotFound />, document.getElementById('app')!)
registerSW()
// A missing URL may be a mistyped list name, so report every 404 as /404.
initAnalytics('/404')
