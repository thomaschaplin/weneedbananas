import '../styles.css'
import { initAnalytics } from '../lib/analytics'
import { registerSW } from '../sw'

registerSW()
initAnalytics()
