# Security policy

We Need Bananas has no server of its own, so its security rests on the code in this repository: how list words and passwords are turned into keys (`src/lib/crypto.ts`, `src/lib/lock.ts`), how passkeys seal a list's password (`src/lib/passkey.ts`), and what is published to public Nostr relays (`src/lib/mailbox.ts`).

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Report it privately through GitHub's [private vulnerability reporting](https://github.com/thomaschaplin/weneedbananas/security/advisories/new) instead.

Helpful things to include:

- what an attacker can learn or change (list contents, words, passwords, another person's device),
- what they need first (the three words, access to a relay, a malicious page, …),
- steps or a proof of concept.

You should get a reply within a week. Fixes ship to weneedbananas.com as soon as they're merged, and reporters are credited in the advisory unless they'd rather not be.

## Known limits (not vulnerabilities)

- Anyone who knows a list's three words can open it, unless the list has a password. That's the design; the words alone are only about 32 bits.
- Public Nostr relays can see that an encrypted event exists, its size and when it was published, but not the words or the items.
