import { NO_SIGNUP } from '../guides'
import { GuidePage } from './Guide'

export function NoSignup() {
  return (
    <GuidePage
      guide={NO_SIGNUP}
      lede="No email, no password, no app store. Start a list, send three words to whoever you shop with, and you're both on it."
    >
      <h2>Who it's for</h2>
      <ul>
        <li>Households who want one list without everyone making an account first.</li>
        <li>Anyone who'd rather not hand over an email address to write down "milk".</li>
        <li>Quick, one-off lists: a party, a holiday cottage, a big shop with a friend.</li>
        <li>Relatives who won't install an app but can open a link.</li>
      </ul>

      <h2>How it works in three steps</h2>
      <ol>
        <li>
          <strong>Start a list.</strong> Tap <a href="/">Start a list</a> and you get three random words, like{' '}
          <code>lemon.fork.bulb</code>. That's the list's name, its address and its key.
        </li>
        <li>
          <strong>Share the words.</strong> Say them out loud, text the link or show the QR code. Whoever opens{' '}
          <code>weneedbananas.com/lemon.fork.bulb</code> is on the list.
        </li>
        <li>
          <strong>Add and tick off.</strong> Add things whenever you remember them. At the shop the list sorts itself
          into aisle order, and everyone sees what's been ticked off.
        </li>
      </ol>

      <h2>The honest privacy bit</h2>
      <p>
        With no account, there's nothing to know about you: no name, email or phone number. Your list is saved on each
        device that opens it, and phones sync directly with each other over an encrypted connection.
      </p>
      <p>
        So that a phone opening the list later still gets your changes, an encrypted copy also waits on a few public
        Nostr relays. They can't read it, and it's deleted 30 days after the list was last opened or changed. We count
        visits with cookieless analytics, and the three words are stripped out before anything is sent.
      </p>
      <p>
        The flip side: anyone who knows the three words can open the list, so share them only with people you shop with.
        And because there's no account, there's no "forgot password" either. If you lose every device that has the list
        and forget the words, it's gone. <a href="/how-it-works">How it works</a> and the{' '}
        <a href="/privacy">privacy page</a> have the details.
      </p>
    </GuidePage>
  )
}
