import { joinRoom, type Room } from 'trystero'
import * as Y from 'yjs'
import { deriveSecrets, type ListScope } from './crypto'

export type Presence = {
  name: string
  shopping: boolean
}

export interface SyncStatus {
  /** Signaling relays reached / room joined. */
  online: boolean
  peers: number
  lastSyncAt: number | null
  presence: Record<string, Presence>
}

type Listener = (s: SyncStatus) => void

// Part of every room's signaling topic and handshake key. Change it whenever trystero's wire protocol changes
// (0.26 drops peers that send 0.25 frames), so devices still running a cached older build never meet newer ones
// and churn through failed connections; between versions, the encrypted mailbox carries changes instead.
const APP_ID = 'weneedbananas.com/p2p-v2'

function bytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  throw new Error('unexpected payload')
}

/**
 * Syncs a Y.Doc with every other device that has the same list open, over
 * WebRTC data channels. Public Nostr relays are used only to find peers; the
 * handshake is encrypted with a password derived from the list's words and
 * the list contents never touch them.
 */
export class P2PProvider {
  private room: Room | null = null
  private listeners = new Set<Listener>()
  private status: SyncStatus = { online: navigator.onLine, peers: 0, lastSyncAt: null, presence: {} }
  private sendSV: ((d: Uint8Array, target?: string | string[]) => Promise<void>) | null = null
  private sendUpdate: ((d: Uint8Array, target?: string | string[]) => Promise<void>) | null = null
  private sendPresence: ((p: Presence, target?: string) => Promise<void>) | null = null
  private me: Presence
  private destroyed = false

  constructor(
    private doc: Y.Doc,
    private scope: string | ListScope,
    me: Presence,
  ) {
    this.me = me
    doc.on('update', this.onDocUpdate)
    document.addEventListener('visibilitychange', this.onWake)
    window.addEventListener('online', this.onOnline)
    window.addEventListener('offline', this.onOffline)
  }

  async connect(): Promise<void> {
    const { roomId, password } = await deriveSecrets(this.scope)
    if (this.destroyed) return
    const room = joinRoom({ appId: APP_ID, password, relayConfig: { warnOnRelayFailure: false } }, roomId)
    this.room = room

    const sv = room.makeAction<Uint8Array>('sv')
    const upd = room.makeAction<Uint8Array>('upd')
    const pres = room.makeAction<Presence>('pres')
    this.sendSV = (d, target) => sv.send(d, target ? { target } : undefined)
    this.sendUpdate = (d, target) => upd.send(d, target ? { target } : undefined)
    this.sendPresence = (p, target) => pres.send(p, target ? { target } : undefined)

    // A peer tells us what it has; we answer with everything it is missing.
    sv.onMessage = (data, { peerId }) => {
      const diff = Y.encodeStateAsUpdate(this.doc, bytes(data))
      void this.sendUpdate?.(diff, peerId)
    }
    upd.onMessage = (data) => {
      Y.applyUpdate(this.doc, bytes(data), this)
      this.set({ lastSyncAt: Date.now() })
    }
    pres.onMessage = (p, { peerId }) => {
      this.set({ presence: { ...this.status.presence, [peerId]: p } })
    }

    room.onPeerJoin = (peerId) => {
      this.set({ peers: Object.keys(room.getPeers()).length, lastSyncAt: Date.now() })
      void this.sendSV?.(Y.encodeStateVector(this.doc), peerId)
      void this.sendPresence?.(this.me, peerId)
    }
    room.onPeerLeave = (peerId) => {
      const presence = { ...this.status.presence }
      delete presence[peerId]
      this.set({ peers: Object.keys(room.getPeers()).length, presence })
    }
    this.set({ online: navigator.onLine })
  }

  setPresence(p: Presence): void {
    this.me = p
    void this.sendPresence?.(p)
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.status)
    return () => this.listeners.delete(fn)
  }

  /** Ask every connected peer for anything we might have missed. */
  resync(): void {
    if (this.room && Object.keys(this.room.getPeers()).length) {
      void this.sendSV?.(Y.encodeStateVector(this.doc))
    }
  }

  destroy(): void {
    this.destroyed = true
    this.doc.off('update', this.onDocUpdate)
    document.removeEventListener('visibilitychange', this.onWake)
    window.removeEventListener('online', this.onOnline)
    window.removeEventListener('offline', this.onOffline)
    void this.room?.leave()
    this.listeners.clear()
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || !this.room) return
    if (Object.keys(this.room.getPeers()).length === 0) return
    void this.sendUpdate?.(update)
    this.set({ lastSyncAt: Date.now() })
  }

  private onWake = () => {
    if (document.visibilityState === 'visible') this.resync()
  }

  private onOnline = () => {
    this.set({ online: true })
    this.resync()
  }

  private onOffline = () => this.set({ online: false })

  private set(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch }
    for (const l of this.listeners) l(this.status)
  }
}
