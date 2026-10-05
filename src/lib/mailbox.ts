import { schnorr } from '@noble/secp256k1'
import * as Y from 'yjs'
import { deriveSecrets } from './crypto'
import { EXPIRY_DAYS } from './expiry'

/**
 * Relays that keep the encrypted list snapshot while no device has the list open. Nostr relays accept events
 * from anyone and keep "addressable" ones (kind 30000-39999), replacing older ones from the same key.
 */
export const MAILBOX_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://nostr.mom']

// NIP-78 application data.
const KIND = 30078
const D_TAG = 'weneedbananas'
const VERSION = 'v1:'
// Relays drop the copy this long after the list was last opened or edited (NIP-40). Every device with the list
// republishes when it opens it, so only lists nobody uses any more expire.
export const EXPIRY_SECONDS = EXPIRY_DAYS * 24 * 60 * 60
// Relays commonly reject events over 64-128 KB; a shopping list is a few KB.
const MAX_CONTENT = 60_000
const PUBLISH_DELAY_MS = 800
// Publish what we have even if no relay answers the first fetch in time.
const FETCH_TIMEOUT_MS = 6_000
const RETRY_MS = 5_000

/**
 * connecting: still fetching the copy. sending: this device has changes the relays haven't confirmed.
 * saved: a relay holds everything this device has. unreachable: no relay can be reached.
 */
export type MailboxState = 'connecting' | 'sending' | 'saved' | 'unreachable'

export interface MailboxStatus {
  state: MailboxState
  /** When changes left by another device were last picked up. */
  receivedAt: number | null
  /** When the newest copy a relay is known to hold expires (ms), if any has been confirmed or fetched. */
  expiresAt?: number | null
}

type Listener = (s: MailboxStatus) => void

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

function toBase64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

interface Relay {
  url: string
  ws: WebSocket | null
  retry: ReturnType<typeof setTimeout> | null
  /** Id of the newest of our events this relay has confirmed. */
  ackedId: string | null
  /** Id of the newest of our events this relay has refused. */
  rejectedId: string | null
}

/**
 * Leaves an encrypted copy of the list on public Nostr relays, so a device that opens the list later picks up
 * changes even if every other device has since gone away. The words never leave the device: events are
 * signed by a key derived from them and the content is AES-GCM encrypted with another, so relays see only a
 * random-looking public key and ciphertext. Each device fetches the copy, merges it (it's a Yjs update, so
 * merging is safe in any order) and replaces it with the merged result whenever it has something new.
 */
export class Mailbox {
  private relays: Relay[]
  private listeners = new Set<Listener>()
  private status: MailboxStatus = { state: 'connecting', receivedAt: null }
  private secretKey: Uint8Array | null = null
  private pubkey = ''
  private aesKey: CryptoKey | null = null
  private ready = false
  /** A relay has answered the fetch. */
  private reached = false
  private dirty = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private latest: NostrEvent | null = null
  private lastCreatedAt = 0
  private seen = new Set<string>()
  private destroyed = false

  constructor(
    private doc: Y.Doc,
    private slug: string,
    urls: string[] = MAILBOX_RELAYS,
    private WS: typeof WebSocket = WebSocket,
  ) {
    this.relays = urls.map((url) => ({ url, ws: null, retry: null, ackedId: null, rejectedId: null }))
    doc.on('update', this.onDocUpdate)
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility)
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onHide)
      window.addEventListener('online', this.onOnline)
    }
  }

  /** Call once the device's own copy has loaded, so the first publish includes it. */
  async start(hasContent: boolean): Promise<void> {
    const { mailboxKey, contentKey } = await deriveSecrets(this.slug)
    if (this.destroyed) return
    this.secretKey = mailboxKey
    this.pubkey = hex(schnorr.getPublicKey(mailboxKey))
    this.aesKey = await crypto.subtle.importKey('raw', contentKey as BufferSource, 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ])
    if (this.destroyed) return
    if (hasContent) this.dirty = true
    for (const r of this.relays) this.open(r)
    setTimeout(() => this.markReady(), FETCH_TIMEOUT_MS)
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.status)
    return () => this.listeners.delete(fn)
  }

  private flush = (): void => {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.ready && this.dirty) void this.publish()
  }

  /**
   * The phone may be put down at any moment, so send without waiting for the first fetch. That's safe: if
   * this replaces a copy holding changes we haven't seen, the device that made them still has them and puts
   * them back the next time it opens the list.
   */
  private onHide = (): void => {
    this.ready = this.ready || this.secretKey !== null
    this.flush()
  }

  /**
   * Send this device's copy now, without waiting for the first fetch (as when the page is hidden), and wait for
   * a relay to confirm it. Resolves true once a relay holds everything this device has, false on timeout.
   */
  async flushNow(timeoutMs = 8_000): Promise<boolean> {
    const end = Date.now() + timeoutMs
    const tick = () => new Promise((r) => setTimeout(r, 100))
    while (!this.secretKey) {
      if (this.destroyed || Date.now() > end) return false
      await tick()
    }
    this.ready = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.dirty) await this.publish()
    for (;;) {
      const id = this.latest?.id
      if (!this.dirty && id && this.relays.some((r) => r.ackedId === id)) return true
      if (this.destroyed || Date.now() > end) return false
      await tick()
    }
  }

  destroy(): void {
    this.destroyed = true
    if (this.timer) clearTimeout(this.timer)
    this.doc.off('update', this.onDocUpdate)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility)
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onHide)
      window.removeEventListener('online', this.onOnline)
    }
    for (const r of this.relays) {
      if (r.retry) clearTimeout(r.retry)
      r.ws?.close()
    }
    this.listeners.clear()
  }

  private open(r: Relay) {
    if (this.destroyed) return
    let ws: WebSocket
    try {
      ws = new this.WS(r.url)
    } catch {
      return this.scheduleRetry(r)
    }
    r.ws = ws
    ws.onopen = () => {
      // Stay subscribed, so copies other devices leave while we're open arrive too.
      ws.send(JSON.stringify(['REQ', 'wnb', { kinds: [KIND], authors: [this.pubkey], '#d': [D_TAG], limit: 1 }]))
      if (this.latest && r.ackedId !== this.latest.id) ws.send(JSON.stringify(['EVENT', this.latest]))
    }
    ws.onmessage = (e) => this.onMessage(r, String(e.data))
    ws.onclose = () => {
      if (r.ws === ws) r.ws = null
      this.scheduleRetry(r)
      this.updateState()
    }
    ws.onerror = () => ws.close()
  }

  private scheduleRetry(r: Relay) {
    if (this.destroyed || r.retry) return
    r.retry = setTimeout(() => {
      r.retry = null
      if (!r.ws) this.open(r)
    }, RETRY_MS)
  }

  private onMessage(r: Relay, raw: string) {
    let msg: unknown[]
    try {
      msg = JSON.parse(raw) as unknown[]
    } catch {
      return
    }
    const [type] = msg
    if (type === 'EVENT') void this.receive(msg[2] as NostrEvent)
    else if (type === 'EOSE') {
      this.reached = true
      this.markReady()
      this.updateState()
    } else if (type === 'OK') {
      if (msg[2] === true) {
        r.ackedId = msg[1] as string
        if (this.latest?.id === r.ackedId) this.noteExpiry(this.latest.created_at + EXPIRY_SECONDS)
      } else r.rejectedId = msg[1] as string
      this.updateState()
    }
  }

  private async receive(ev: NostrEvent) {
    if (!ev || ev.pubkey !== this.pubkey || ev.kind !== KIND || this.seen.has(ev.id)) return
    this.seen.add(ev.id)
    if (!this.aesKey || !ev.content.startsWith(VERSION)) return
    // A relay that hasn't purged it yet may still hand out an expired copy.
    const expiry = Number(ev.tags.find((t) => t[0] === 'expiration')?.[1])
    if (expiry && expiry <= Date.now() / 1000) return
    this.lastCreatedAt = Math.max(this.lastCreatedAt, ev.created_at)
    if (ev.id === this.latest?.id) return
    let update: Uint8Array
    try {
      const data = fromBase64(ev.content.slice(VERSION.length))
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: data.subarray(0, 12) },
        this.aesKey,
        data.subarray(12),
      )
      update = new Uint8Array(plain)
    } catch {
      // Not ours, or tampered with: the authenticated encryption check failed.
      return
    }
    if (this.destroyed) return
    // It decrypted, so it's ours and a relay holds it until then.
    if (expiry) this.noteExpiry(expiry)
    const before = Y.snapshot(this.doc)
    Y.applyUpdate(this.doc, update, this)
    if (!Y.equalSnapshots(before, Y.snapshot(this.doc))) this.set({ receivedAt: Date.now() })
    // If we hold anything the copy lacks, replace it with the merged result.
    const remote = new Y.Doc()
    Y.applyUpdate(remote, update)
    if (!Y.equalSnapshots(Y.snapshot(remote), Y.snapshot(this.doc))) this.markDirty()
    remote.destroy()
  }

  private noteExpiry(seconds: number) {
    const ms = seconds * 1000
    if (ms > (this.status.expiresAt ?? 0)) this.set({ expiresAt: ms })
  }

  private markReady() {
    if (this.ready || this.destroyed || !this.secretKey) return
    this.ready = true
    if (this.dirty) this.schedule()
    this.updateState()
  }

  private onDocUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin === this) return
    this.markDirty()
  }

  private markDirty() {
    this.dirty = true
    this.schedule()
    this.updateState()
  }

  private schedule() {
    if (!this.ready || this.timer) return
    this.timer = setTimeout(this.flush, PUBLISH_DELAY_MS)
  }

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.onHide()
  }

  private onOnline = () => {
    for (const r of this.relays) if (!r.ws) this.open(r)
  }

  private async publish() {
    if (!this.secretKey || !this.aesKey) return
    this.dirty = false
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.aesKey,
        Y.encodeStateAsUpdate(this.doc) as BufferSource,
      ),
    )
    const sealed = new Uint8Array(12 + cipher.length)
    sealed.set(iv)
    sealed.set(cipher, 12)
    const content = VERSION + toBase64(sealed)
    if (content.length > MAX_CONTENT) {
      console.warn('weneedbananas: list too large to leave in the mailbox')
      return this.updateState()
    }
    // Relays keep the event with the newest created_at, so never go backwards.
    const created_at = Math.max(Math.floor(Date.now() / 1000), this.lastCreatedAt + 1)
    this.lastCreatedAt = created_at
    const tags = [
      ['d', D_TAG],
      ['expiration', String(created_at + EXPIRY_SECONDS)],
    ]
    const id = new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify([0, this.pubkey, created_at, KIND, tags, content])),
      ),
    )
    const sig = await schnorr.signAsync(id, this.secretKey)
    if (this.destroyed) return
    const ev: NostrEvent = { id: hex(id), pubkey: this.pubkey, created_at, kind: KIND, tags, content, sig: hex(sig) }
    this.latest = ev
    this.seen.add(ev.id)
    const msg = JSON.stringify(['EVENT', ev])
    for (const r of this.relays) if (r.ws?.readyState === 1) r.ws.send(msg)
    this.updateState()
  }

  private updateState() {
    const id = this.latest?.id
    const acked = id !== undefined && this.relays.some((r) => r.ackedId === id)
    // Still worth waiting on: an open relay that hasn't refused the newest copy.
    const anyOpen = this.relays.some((r) => r.ws?.readyState === 1 && (!id || r.rejectedId !== id))
    let state: MailboxState
    if (!this.ready) state = 'connecting'
    else if (this.dirty || (this.latest && !acked)) state = anyOpen ? 'sending' : 'unreachable'
    else state = acked || this.reached ? 'saved' : 'unreachable'
    if (state !== this.status.state) this.set({ state })
  }

  private set(patch: Partial<MailboxStatus>) {
    this.status = { ...this.status, ...patch }
    for (const l of this.listeners) l(this.status)
  }
}
