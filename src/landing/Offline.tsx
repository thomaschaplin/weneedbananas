import { Page } from './Layout'
import { StartJoin } from './StartJoin'

export function Offline() {
  return (
    <Page>
      <section class="prose error-page">
        <p class="eyebrow">Offline</p>
        <h1>No signal in this aisle.</h1>
        <p class="lede">
          This page isn't saved on your device, so it needs a connection. Your lists are saved, though, and work
          offline: open one below or start a new one. Changes sync once you're back online with someone else on the
          list.
        </p>
        <StartJoin />
      </section>
    </Page>
  )
}
