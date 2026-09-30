// Derive everything the network sees from the three words, so the words
// themselves never leave the device. PBKDF2 is deliberately slow to make
// guessing list names from observed room ids expensive.
const ITERATIONS = 600_000
const SALT = 'weneedbananas.com/v1'

export interface ListSecrets {
  roomId: string
  password: string
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
    512,
  )
  const hex = [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { roomId: hex.slice(0, 64), password: hex.slice(64) }
}
