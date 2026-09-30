import { Page } from './Layout'

export function Privacy() {
  return (
    <Page>
      <article class="prose">
        <h1>Privacy</h1>
        <p class="lede">Short version: we don't have your data, so we can't lose it, sell it or show it to anyone.</p>

        <h2>What we collect</h2>
        <p>
          Nothing about you or your lists. There are no accounts, no emails, no ads and no cookies. We have no
          database.
        </p>
        <p>
          We count visits and page speed with Vercel Web Analytics and Speed Insights, which are cookieless and don't
          identify you. On list pages the three words are replaced with a plain "/list" before anything is sent, so
          they never leave your device.
        </p>
        <p>
          Your browser remembers a few conveniences for you: the lists you've opened, and the name you optionally set
          so others see who's at the shop. These stay on your device.
        </p>

        <h2>Where your list lives</h2>
        <p>
          Only on the devices that open it, in the browser's local storage (IndexedDB). It is sent directly between
          those devices over encrypted WebRTC connections.
        </p>

        <h2>Who else is involved</h2>
        <ul>
          <li>
            <strong>Our web host (Vercel)</strong> serves the website files, like any website, and keeps standard
            short-lived request logs. Once the app is installed on your device (it happens automatically on first
            visit), list pages load from your device and don't need the host at all.
          </li>
          <li>
            <strong>Public Nostr relays</strong> help devices with the same list find each other. They see a
            scrambled room id derived from your words and an encrypted handshake, never the words or the items.
          </li>
          <li>
            <strong>Public STUN servers</strong> help devices behind home routers connect, as with any browser video
            call. They see IP addresses, not list contents.
          </li>
        </ul>

        <h2>Search engines</h2>
        <p>
          List pages tell search engines and crawlers not to index, archive or follow them, and they are excluded in
          robots.txt and from the sitemap. Nothing about your list is published anywhere.
        </p>

        <h2>Who can see a list</h2>
        <p>
          Anyone who knows its three words. Treat them like a door code: share them with the people you shop with. If
          you need a fresh start, create a new list and stop using the old one.
        </p>

        <h2>Deleting</h2>
        <p>
          In a list, open the menu and choose "Remove from this device". Once every device that had the list removes
          it, it no longer exists anywhere.
        </p>
      </article>
    </Page>
  )
}
