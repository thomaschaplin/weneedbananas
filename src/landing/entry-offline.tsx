import { hydrate } from 'preact'
import '../styles.css'
import { Offline } from './Offline'

// No analytics: this page is only ever shown by the service worker while offline.
hydrate(<Offline />, document.getElementById('app')!)
