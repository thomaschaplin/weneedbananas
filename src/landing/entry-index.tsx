import { hydrate } from 'preact'
import '../styles.css'
import { initAnalytics } from '../lib/analytics'
import { registerSW } from '../sw'
import { Landing } from './Landing'

hydrate(<Landing />, document.getElementById('app')!)
registerSW()
initAnalytics()
