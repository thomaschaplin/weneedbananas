import type { QA } from './content'

/** Use-case guide pages. Used for the visible pages, their FAQs and structured data, so they never drift. */
export interface Guide {
  path: string
  /** Short name for breadcrumbs and links. */
  name: string
  headline: string
  description: string
  faq: QA[]
}

export const NO_SIGNUP: Guide = {
  path: '/shared-shopping-list-no-signup',
  name: 'Shared list with no signup',
  headline: 'A shared shopping list with no account',
  description:
    'Share a shopping list without signing up: no email, no password, no app store. Start a list, send its three words, and everyone with them is on the same list.',
  faq: [
    {
      q: 'Do I really not need an account?',
      a: 'Really. There is no signup, email, password or phone number. You start a list, you get three random words, and those words are the list. Anyone you send them to can open it straight away.',
    },
    {
      q: 'Do the other people need to install anything?',
      a: "No. They open the link (or type the three words at weneedbananas.com) in their phone browser. They can add it to their home screen if they like, but they don't have to.",
    },
    {
      q: 'What happens if I lose my phone?',
      a: 'Open the same three words on your new phone. If anyone else on the list has it, or someone has opened it in the last 30 days, the list comes back. If you were the only person using it and you lose both the phone and the words, the list is gone, because there is no account to recover it from.',
    },
    {
      q: 'Can someone guess my list?',
      a: 'There are around four billion three-word combinations, and list pages are hidden from search engines, so stumbling on one is very unlikely. But anyone who knows the words can open it, so share them like a door code, only with people you shop with.',
    },
  ],
}

export const FAMILY: Guide = {
  path: '/family-shopping-list',
  name: 'Family shopping list',
  headline: 'A shopping list the whole household can share',
  description:
    'A free shared shopping list for families, flatmates and couples. Everyone adds to one list, it sorts itself by aisle, and you can see when someone is at the shop.',
  faq: [
    {
      q: 'How do I get everyone in the house on the same list?',
      a: 'Start a list and share its three words: say them out loud, text the link or show the QR code. Everyone who opens it is on the same list, on any phone, tablet or computer with a modern browser.',
    },
    {
      q: 'Can two people add things at the same time?',
      a: 'Yes. Edits from different phones merge automatically, even if one of you was offline at the time. Add the same thing twice and the quantities combine instead of making two lines.',
    },
    {
      q: 'Will I get a notification when someone adds something?',
      a: "No. We Need Bananas doesn't send notifications. The list is up to date whenever you open it, and if you have it open while someone else does, you see their changes live.",
    },
    {
      q: 'Can we have more than one list?',
      a: 'Yes, as many as you like, for example one for the weekly shop and one for the corner shop. Each list has its own three words, and your phone remembers the ones you have opened.',
    },
  ],
}

export const ALTERNATIVES: Guide = {
  path: '/shopping-list-app-alternatives',
  name: 'Shopping list app alternatives',
  headline: 'Shopping list apps compared: accounts, ads and where your list lives',
  description:
    "An honest look at how a no-account shared shopping list compares with typical shopping list apps: signup, ads, data storage, offline use, and the features we don't have.",
  faq: [
    {
      q: 'Is We Need Bananas a good alternative to a shopping list app with an account?',
      a: 'It is if you mostly want one shared list that your household can open without signing up, sorted by aisle and usable offline. If you rely on notifications, recipe import from websites, loyalty cards or voice assistants, an account-based app will suit you better.',
    },
    {
      q: 'What does We Need Bananas not do?',
      a: "It doesn't send notifications, import recipes from a web link, connect to loyalty cards or online grocery shopping, or work with voice assistants. There is no account, so there's nothing to recover a list from if you lose every device that had it and forget the words.",
    },
    {
      q: 'Do lists expire?',
      a: "The list on your phone doesn't expire. The encrypted copy left on public relays, so phones can pick up changes later, expires 30 days after anyone last opened or changed the list. A list in regular use is refreshed every time it's opened.",
    },
    {
      q: 'Why is it free?',
      a: "There are no servers storing lists, so it costs very little to run. There are no ads, no accounts and nothing about what you buy is collected, so there's nothing to sell.",
    },
  ],
}

export const GUIDES: Guide[] = [NO_SIGNUP, FAMILY, ALTERNATIVES]
