import { Page } from './Layout'
import { SyncDiagram } from './SyncDiagram'

export function HowItWorks() {
  return (
    <Page>
      <article class="prose">
        <h1>How a shared list works with no server</h1>
        <p class="lede">
          We Need Bananas has no accounts and no database. Here's how your list gets from your kitchen to the person at
          the shop.
        </p>

        <h2>The three words are the list</h2>
        <p>
          When you start a list you get three random words, like <code>lemon.fork.bulb</code>, picked from about 1,600
          everyday words. That's around four billion possible lists. The words are the list's name, its address (
          <code>weneedbananas.com/lemon.fork.bulb</code>) and its key.
        </p>
        <p>
          On your device the words are stretched into a secret key (PBKDF2 with 600,000 rounds). That key produces a
          scrambled room id, which lets devices with the same list find each other, and a password that encrypts the
          connection handshake.
        </p>

        <h2>Every device keeps the whole list</h2>
        <p>
          Your list is saved in your browser's own storage. You can close the tab, lose signal or put your phone in
          airplane mode and it's still there. The site works offline once you've opened it.
        </p>

        <h2>Devices sync directly with each other</h2>
        <p>
          When two devices have the same list open, they connect peer-to-peer over WebRTC, the same technology used for
          video calls in the browser, and swap changes directly. To find each other they use free public Nostr relays,
          which only ever see the scrambled room id and an encrypted handshake. Your items go straight from device to
          device.
        </p>
        <p>
          The list is a CRDT (we use <a href="https://yjs.dev">Yjs</a>). That means two people can edit offline at the
          same time and their changes merge cleanly when they reconnect. Nobody's edits get lost.
        </p>

        <h2>Step by step</h2>
        <p>Here's everything that happens between two phones, from typing in the words to an item showing up.</p>
        <SyncDiagram />

        <h2>The one trade-off</h2>
        <p>
          With no server holding the list, <strong>two devices need to have it open at the same time</strong> for
          changes to pass between them. In practice that happens naturally: open the list when you get to the shop and
          anyone at home with it open syncs instantly. The badge at the top of the list always tells you whether you're{' '}
          <em>live</em> with someone or only saved on this device.
        </p>
        <p>
          Tip: if you're adding things for someone else to buy, open the list once while they have it open too, even for
          a few seconds, and everything comes across.
        </p>

        <h2>Built for shopping</h2>
        <ul>
          <li>Items sort into aisle order automatically, and you can reorder the aisles to match your shop.</li>
          <li>Quantities are understood: "2 pints milk", "500g mince", "bananas x6". Duplicates merge.</li>
          <li>Shop mode keeps your screen awake with big tick targets and a count of what's left.</li>
          <li>"Couldn't find it" keeps an item for next time. "Done shopping" clears what you bought.</li>
          <li>Things you buy often come back as one-tap usuals.</li>
        </ul>

        <p>
          <a class="btn btn-primary" href="/">
            Start a list
          </a>
        </p>
      </article>
    </Page>
  )
}
