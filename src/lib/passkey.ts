import { normalizePassword, type Lock } from './crypto'
import type { LockInfo, PasskeyEntry } from './doc'
import { tryPassword } from './lock'

// A passkey can't log anyone in here, as there is no server to log in to. Instead its PRF extension turns a
// fixed input into a secret only that passkey can produce again, and that secret seals the list's password.
// The sealed copy goes in the list under the words alone, so any device the passkey syncs to (and that has the
// words) can unseal the password and open the list without it being typed.

const INFO = 'weneedbananas.com/passkey/v1'
const enc = new TextEncoder()

const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const unb64url = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

/** What the passkey is asked to turn into a secret: different for every list and every password set on it. */
async function prfInput(slug: string, salt: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${INFO}\n${slug}\n${salt}`)))
}

async function sealKey(secret: Uint8Array<ArrayBuffer>, usage: KeyUsage): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc.encode(INFO) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  )
}

// Bound to the list and the lock, so a sealed password can't be passed off as belonging to another one.
const aad = (slug: string, salt: string) => enc.encode(`${slug}\n${salt}`)

/** Seal a list's password with a passkey's PRF output. */
export async function seal(slug: string, lock: Lock, secret: Uint8Array<ArrayBuffer>): Promise<PasskeyEntry> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(slug, lock.salt) },
    await sealKey(secret, 'encrypt'),
    enc.encode(normalizePassword(lock.password)),
  )
  return { salt: lock.salt, iv: b64url(iv), ct: b64url(new Uint8Array(ct)) }
}

/** The password sealed in `entry`, or null if `secret` is from another passkey or the entry was tampered with. */
export async function unseal(
  slug: string,
  entry: PasskeyEntry,
  secret: Uint8Array<ArrayBuffer>,
): Promise<string | null> {
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64url(entry.iv), additionalData: aad(slug, entry.salt) },
      await sealKey(secret, 'decrypt'),
      unb64url(entry.ct),
    )
    return new TextDecoder().decode(pt)
  } catch {
    return null
  }
}

/** Whether this browser can probably use a passkey's PRF extension. Only a real attempt says for sure. */
export async function passkeysSupported(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials) return false
  const caps = (PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> })
    .getClientCapabilities
  if (!caps) return true
  try {
    return (await caps.call(PublicKeyCredential))['extension:prf'] !== false
  } catch {
    return true
  }
}

/** The passkey was made, or picked, but can't produce the secret needed to seal a password. */
export class NoPrfError extends Error {
  constructor() {
    super("This passkey can't unlock lists")
  }
}

/** Someone closed the passkey prompt, or it timed out. Not worth an error message. */
export const cancelled = (e: unknown) => e instanceof DOMException && e.name === 'NotAllowedError'

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: BufferSource } } }

const prfFirst = (cred: PublicKeyCredential): Uint8Array<ArrayBuffer> | null => {
  const first = (cred.getClientExtensionResults() as PrfResults).prf?.results?.first
  if (!first) return null
  return first instanceof ArrayBuffer
    ? new Uint8Array(first)
    : new Uint8Array(first.buffer as ArrayBuffer, first.byteOffset, first.byteLength).slice()
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32))

async function getSecret(
  input: Uint8Array,
  allow: string[],
): Promise<{ id: string; secret: Uint8Array<ArrayBuffer> } | null> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      allowCredentials: allow.map((id) => ({ type: 'public-key', id: unb64url(id) })),
      userVerification: 'required',
      extensions: { prf: { eval: { first: input } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!cred) return null
  const secret = prfFirst(cred)
  if (!secret) throw new NoPrfError()
  return { id: b64url(new Uint8Array(cred.rawId)), secret }
}

/**
 * Make a new passkey for this list and seal the password with it. The passkey is named after the list's words
 * so it can be told apart from others in a password manager, which is a place meant for secrets.
 */
export async function createPasskey(slug: string, lock: Lock): Promise<{ id: string; entry: PasskeyEntry }> {
  const input = await prfInput(slug, lock.salt)
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'We Need Bananas' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: slug, displayName: slug },
      challenge: challenge(),
      // Ed25519, P-256, RSA: whichever the authenticator has.
      pubKeyCredParams: [
        { type: 'public-key', alg: -8 },
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: { eval: { first: input } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new NoPrfError()
  const id = b64url(new Uint8Array(cred.rawId))
  let secret = prfFirst(cred)
  if (!secret) {
    // Some authenticators only say PRF works when the passkey is made, and give the secret when it's next used.
    if ((cred.getClientExtensionResults() as PrfResults).prf?.enabled === false) throw new NoPrfError()
    secret = (await getSecret(input, [id]))?.secret ?? null
    if (!secret) throw new NoPrfError()
  }
  return { id, entry: await seal(slug, lock, secret) }
}

/**
 * Open a password list with one of the passkeys added to it. Resolves the lock, or null if the passkey picked
 * doesn't open the list (e.g. its sealed password has been replaced).
 */
export async function unlockWithPasskey(
  slug: string,
  info: LockInfo,
  entries: Map<string, PasskeyEntry>,
): Promise<Lock | null> {
  const got = await getSecret(await prfInput(slug, info.salt), [...entries.keys()])
  const entry = got && entries.get(got.id)
  if (!got || !entry) return null
  const password = await unseal(slug, entry, got.secret)
  return password === null ? null : tryPassword(slug, info, password)
}
