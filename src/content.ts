export const SITE = {
  url: 'https://weneedbananas.com',
  name: 'We Need Bananas',
  tagline: 'The shared shopping list you open with three words.',
  description:
    'A free shared shopping list with no signup, no email and no app to install. Start a list, share its three words, and add things from anywhere. It sorts itself by aisle for when you get to the shop.',
}

export interface QA {
  q: string
  a: string
}

/** Used for both the visible FAQ and the FAQPage structured data, so they never drift. */
export const FAQ: QA[] = [
  {
    q: 'How do I share a shopping list without making an account?',
    a: 'Tap "Start a list" and you get a list named with three random words, like lemon.fork.bulb. Send those words (or the link weneedbananas.com/lemon.fork.bulb) to anyone. Whoever opens it is on the same list. There is no signup, email, password or app to install.',
  },
  {
    q: 'Where is my list stored?',
    a: 'On your own devices. Every phone or computer that opens the list keeps a full copy in the browser, and copies sync directly between devices over an encrypted peer-to-peer connection (WebRTC). So that a phone opening the list later still gets your changes, an encrypted copy also waits on a few public Nostr relays, which cannot read it and delete it 30 days after the list was last used. We have no database and no server of our own that stores lists.',
  },
  {
    q: 'Do both phones need the list open to sync?',
    a: 'No. Add your items, put your phone down, and whoever opens the list next gets them. Each phone leaves an encrypted copy of the list on public relays for the next device to pick up, and when two phones have the list open at the same time they sync live, directly. Changes made offline merge automatically. The badge at the top shows whether you are live with someone or your changes are up to date.',
  },
  {
    q: 'Does it work in a shop with no signal?',
    a: 'Yes. The list is saved on your phone and the site works offline once you have opened it. Tick things off as you go; your changes are sent when you are back online.',
  },
  {
    q: 'Is my shopping list private?',
    a: 'List pages are never indexed by search engines. The words are turned into secret keys on your device and never leave it. Items go directly between phones, and the copy left on public relays for later is encrypted with a key only the words can produce, so the relays see scrambled data, not your words or items. Anyone who knows the three words can open the list, so share them only with people you shop with. If they get out, "Move to new words" in the list\'s settings moves everything to a fresh list and leaves the old words empty. For more protection, add a password in the list\'s settings: then the words alone open nothing, and everyone on the list types the password once on each device.',
  },
  {
    q: 'What makes this better than a notes app or a to-do list?',
    a: 'It is built for the shop. Items sort themselves into aisle order (fruit & veg, bakery, dairy…), so you walk the shop once. "2 pints milk" and "500g mince" are understood as quantities, duplicates merge instead of piling up, and Shop mode keeps your screen awake with big one-thumb tick targets. You can mark something "couldn\'t find it" so it rolls over to next time, and your household sees when someone is at the shop.',
  },
  {
    q: 'Can I add several items at once, like from a recipe?',
    a: 'Yes. Paste or type a list separated by commas or new lines ("2 onions, garlic, 400g chopped tomatoes") and each line becomes its own item, sorted into its aisle.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. There are no ads, no accounts and no tracking of what you buy.',
  },
  {
    q: 'How do I delete a list?',
    a: 'Open the list, tap the menu and choose "Remove from this device". Because lists only live on devices, a list is gone for good once every device that has it removes it.',
  },
]
