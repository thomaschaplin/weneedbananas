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
    a: 'On your own devices. Every phone or computer that opens the list keeps a full copy in the browser, and copies sync directly between devices over an encrypted peer-to-peer connection (WebRTC). We have no database and no server that stores lists.',
  },
  {
    q: 'Do both phones need the list open to sync?',
    a: 'Yes. Because there is no server in the middle, changes move when two devices have the list open at the same time, even briefly. Each device remembers everything, and changes made offline merge automatically the next time they meet. The badge at the top shows whether you are live with anyone right now.',
  },
  {
    q: 'Does it work in a shop with no signal?',
    a: 'Yes. The list is saved on your phone and the site works offline once you have opened it. Tick things off as you go; your changes sync when you are back online with someone else who has the list open.',
  },
  {
    q: 'Is my shopping list private?',
    a: 'List pages are never indexed by search engines and your items never leave your devices except to go directly to the other people on the list. The words are turned into a secret key on your device; public relays only help devices find each other and see a scrambled room id, not your words or items. Anyone who knows the three words can open the list, so share them only with people you shop with.',
  },
  {
    q: 'What makes this better than a notes app or a to-do list?',
    a: 'It is built for the shop. Items sort themselves into aisle order (fruit & veg, bakery, dairy…), so you walk the shop once. "2 milk" and "500g mince" are understood as quantities, duplicates merge instead of piling up, and Shop mode keeps your screen awake with big one-thumb tick targets. You can mark something "couldn\'t find it" so it rolls over to next time, and your household sees when someone is at the shop.',
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
