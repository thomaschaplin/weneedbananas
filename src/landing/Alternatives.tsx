import { ALTERNATIVES } from '../guides'
import { GuidePage } from './Guide'

// Generic categories only: no claims about named apps, whose pricing and features change.
const TRADEOFFS: { topic: string; typical: string; ours: string }[] = [
  {
    topic: 'Getting started',
    typical: 'Most list apps ask everyone to install the app and create an account before they can share a list.',
    ours: 'Open the website and tap Start a list. Others join with three words or a link. Nothing to install.',
  },
  {
    topic: 'Ads and paid tiers',
    typical: 'Free tiers are often paid for with ads, or keep some features for a subscription.',
    ours: 'Free, with no ads and no paid tier.',
  },
  {
    topic: 'Where your list is stored',
    typical: "Usually on the app maker's servers, tied to your account, alongside what you've bought over time.",
    ours: 'On the devices that open it. Phones sync directly, and an encrypted copy that relays cannot read waits for up to 30 days.',
  },
  {
    topic: 'Offline in the shop',
    typical: 'Varies. Many apps cache your list, some need a connection to load or sync it.',
    ours: 'Works offline once opened. Changes are sent when you are back online and merge automatically.',
  },
  {
    topic: 'Losing your phone',
    typical: 'Sign in on a new phone and your lists come back from your account.',
    ours: 'Open the same three words on a new phone. If nobody else has the list and it has not been opened for 30 days, it is gone.',
  },
  {
    topic: 'Extras',
    typical:
      'Bigger apps may offer recipes, meal plans, loyalty cards, price comparison, clipping from websites or voice assistants.',
    ours: 'None of those. Just a list that sorts by aisle, understands quantities and has a shop mode.',
  },
]

export function Alternatives() {
  return (
    <GuidePage
      guide={ALTERNATIVES}
      lede="There are lots of good shopping list apps. Here's how a list with no account differs from a typical one, including the things we don't do."
    >
      <h2>The short version</h2>
      <p>
        Most shopping list apps are built around an account: you sign up, your lists are stored on the company's
        servers, and you get extras like recipes or notifications in return. We Need Bananas goes the other way. There
        is no account, the list lives on your devices, and it does one job: a shared list that's quick to use in the
        shop.
      </p>

      <h2>How they compare</h2>
      <div class="who-sees">
        {TRADEOFFS.map((t) => (
          <section class="who" key={t.topic}>
            <h3>{t.topic}</h3>
            <p>
              <span class="who-tag who-no">Typical list app</span>
              {t.typical}
            </p>
            <p>
              <span class="who-tag who-yes">We Need Bananas</span>
              {t.ours}
            </p>
          </section>
        ))}
      </div>

      <h2>What we don't do</h2>
      <ul>
        <li>
          <strong>No notifications.</strong> Nobody gets a ping when you add something. Open the list to see what's new,
          or watch changes arrive live while someone else has it open.
        </li>
        <li>
          <strong>No recipe import from links.</strong> You can paste a list of ingredients and each line becomes an
          item, but we can't fetch a recipe from a web page.
        </li>
        <li>
          <strong>Relay copies expire.</strong> The encrypted copy that lets phones catch up later is deleted 30 days
          after anyone last opened or changed the list. Lists in regular use never run out.
        </li>
        <li>
          <strong>One device is a single point of failure.</strong> If you're the only one using a list and you clear
          your browser or lose your phone, you need the three words to get it back, and only within those 30 days.
        </li>
        <li>
          <strong>No loyalty cards, prices, meal plans or voice assistants.</strong> If you rely on those, an
          account-based app will suit you better.
        </li>
      </ul>

      <h2>Notes apps and group chats</h2>
      <p>
        A shared note or a family group chat works too, and you probably already have one. The difference is in the
        shop: we sort items into aisle order, merge duplicates (6 eggs plus 6 eggs is 12 eggs, not two lines), keep the
        screen awake and let you tick things off with one thumb, and the list shows who's at the shop right now.
      </p>

      <h2>When we're a good fit</h2>
      <ul>
        <li>You want a shared list today, without getting everyone to sign up for something.</li>
        <li>You'd rather your shopping habits weren't stored on someone else's server.</li>
        <li>You mostly need a list that's fast and works with no signal in the shop.</li>
      </ul>
      <p>
        See <a href="/shared-shopping-list-no-signup">sharing a list with no account</a> or{' '}
        <a href="/family-shopping-list">a list for the whole household</a>.
      </p>
    </GuidePage>
  )
}
