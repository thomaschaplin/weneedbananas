// Derive everything the network sees from the three words (and a list's password, if it has one), so neither
// ever leaves the device. PBKDF2 is deliberately slow to make guessing list names from observed room ids
// expensive.
const ITERATIONS = 600_000
const SALT = 'weneedbananas.com/v1'
const LOCK_SALT = 'weneedbananas.com/lock/v1:'

/** A list's password and the random salt chosen when it was set. Together with the words they open the list. */
export interface Lock {
  password: string
  /** Hex. Fresh for every password set, so no two password lists share keys and no table of guesses fits all. */
  salt: string
}

/** Which list on the network: the words alone, or the words with a password. */
export interface ListScope {
  slug: string
  lock?: Lock
}

export interface ListSecrets {
  roomId: string
  password: string
  /** Signs the list's mailbox events, so only holders of the words can replace them. */
  mailboxKey: Uint8Array
  /** AES-GCM key for the list snapshot left in the mailbox. */
  contentKey: Uint8Array
}

const cache = new Map<string, Promise<ListSecrets>>()

const scopeOf = (s: string | ListScope): ListScope => (typeof s === 'string' ? { slug: s } : s)

/** Passwords are compared as typed, apart from stray spaces and how the keyboard composed accented letters. */
export const normalizePassword = (p: string) => p.normalize('NFC').trim()

export function deriveSecrets(scope: string | ListScope): Promise<ListSecrets> {
  const { slug, lock } = scopeOf(scope)
  const secret = lock ? `${slug}\n${normalizePassword(lock.password)}` : slug
  const salt = lock ? LOCK_SALT + lock.salt : SALT
  const id = `${salt}\n${secret}`
  let p = cache.get(id)
  if (!p) {
    p = derive(secret, salt)
    cache.set(id, p)
  }
  return p
}

async function derive(secret: string, salt: string): Promise<ListSecrets> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITERATIONS },
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
