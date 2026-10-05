// Derive everything the network sees from the three words, so the words
// themselves never leave the device. PBKDF2 is deliberately slow to make
// guessing list names from observed room ids expensive.
const ITERATIONS = 600_000
const SALT = 'weneedbananas.com/v1'

export interface ListSecrets {
  roomId: string
  password: string
  /** Signs the list's mailbox events, so only holders of the words can replace them. */
  mailboxKey: Uint8Array
  /** AES-GCM key for the list snapshot left in the mailbox. */
  contentKey: Uint8Array
}

const cache = new Map<string, Promise<ListSecrets>>()

export function deriveSecrets(slug: string): Promise<ListSecrets> {
  let p = cache.get(slug)
  if (!p) {
    p = derive(slug)
    cache.set(slug, p)
  }
  return p
}

async function derive(slug: string): Promise<ListSecrets> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(slug), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS },
    key,
    // PBKDF2 output is a stream, so the first 512 bits (room id and password) are the same as before the
    // mailbox keys were added and existing lists still find each other.
    1024,
  )
  const out = new Uint8Array(bits)
  const hex = [...out.subarray(0, 64)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return {
    roomId: hex.slice(0, 64),
    password: hex.slice(64),
    mailboxKey: out.slice(64, 96),
    contentKey: out.slice(96, 128),
  }
}
