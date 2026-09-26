import { hydrate } from 'preact'
import '../styles.css'
import { registerSW } from '../sw'
import { Landing } from './Landing'

hydrate(<Landing />, document.getElementById('app')!)
registerSW()
