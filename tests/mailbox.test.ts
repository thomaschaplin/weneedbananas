import { afterEach, describe, expect, it } from 'vitest'
import { deriveSecrets } from '../src/lib/crypto'
import { addItems, allItems, createListDoc, setDone } from '../src/lib/doc'
import { EXPIRY_SECONDS, Mailbox, type MailboxState } from '../src/lib/mailbox'
import { parseMany } from '../src/lib/parse'

type Ev = { id: string; pubkey: string; kind: number; created_at: number; tags: string[][] }
type Filter = { kinds: number[]; authors: string[]; '#d': string[] }

/** One in-memory relay that keeps the newest addressable event per author and d tag, as real relays do. */
class FakeRelay {
  stored = new Map<string, Ev>()
  sockets = new Set<FakeSocket>()
  reject = false

  handle(ws: FakeSocket, msg: unknown[]) {
    if (msg[0] === 'REQ') {
      const [, subId, f] = msg as [string, string, Filter]
      ws.subs.set(subId, f)
      for (const ev of this.stored.values()) if (match(f, ev)) ws.deliver(['EVENT', subId, ev])
      ws.deliver(['EOSE', subId])
    } else if (msg[0] === 'EVENT') {
      const ev = msg[1] as Ev
      if (this.reject) return ws.deliver(['OK', ev.id, false, 'blocked: test'])
      const key = `${ev.pubkey}:${ev.tags.find((t) => t[0] === 'd')?.[1]}`
      const old = this.stored.get(key)
      if (!old || ev.created_at >= old.created_at) this.stored.set(key, ev)
      ws.deliver(['OK', ev.id, true, ''])
      for (const s of this.sockets) {
        if (s === ws) continue
        for (const [subId, f] of s.subs) if (match(f, ev)) s.deliver(['EVENT', subId, ev])
      }
    }
  }
}

const match = (f: Filter, ev: Ev) =>
  f.kinds.includes(ev.kind) &&
  f.authors.includes(ev.pubkey) &&
  ev.tags.some((t) => t[0] === 'd' && f['#d'].includes(t[1]))

let relay = new FakeRelay()

class FakeSocket {
  readyState = 0
  subs = new Map<string, Filter>()
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  private relay = relay

  constructor(_url: string) {
    this.relay.sockets.add(this)
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.()
    })
  }
  send(raw: string) {
    setTimeout(() => this.relay.handle(this, JSON.parse(raw) as unknown[]))
  }
  deliver(msg: unknown[]) {
    setTimeout(() => this.readyState === 1 && this.onmessage?.({ data: JSON.stringify(msg) }))
  }
  close() {
    this.readyState = 3
    this.relay.sockets.delete(this)
    this.onclose?.()
  }
}

const SLUG = 'lemon.fork.bulb'
const open: Mailbox[] = []

function device() {
  const ld = createListDoc()
  const mb = new Mailbox(ld.doc, SLUG, ['wss://fake'], FakeSocket as unknown as typeof WebSocket)
  open.push(mb)
  const states: MailboxState[] = []
  mb.subscribe((s) => states.push(s.state))
  return { ld, mb, states, state: () => states[states.length - 1] }
}

async function until(fn: () => boolean, ms = 5000) {
  const end = Date.now() + ms
  while (!fn()) {
    if (Date.now() > end) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 20))
  }
}

const names = (ld: ReturnType<typeof createListDoc>) =>
  allItems(ld)
    .map((i) => i.name)
    .sort()

afterEach(() => {
  for (const mb of open.splice(0)) mb.destroy()
  relay = new FakeRelay()
})

describe('mailbox', () => {
  it('keeps the original room id and password for existing lists', async () => {
    const s = await deriveSecrets(SLUG)
    expect(s.roomId).toBe('4068f222db6f03ca1d26ecffaad980f1edcd8e37a3098e1e597a1c3807dc5434')
    expect(s.password).toBe('d23a87d7aedd21c3a57ca7ed69af561ed439fb407c038b74a38fb938d6d6a31a')
    expect(s.mailboxKey).toHaveLength(32)
    expect(s.contentKey).toHaveLength(32)
  })

  it('hands a list to a device that opens it after the first has gone', async () => {
    const a = device()
    await a.mb.start(false)
    addItems(a.ld, parseMany('eggs, bread'))
    await until(() => a.state() === 'saved')
    a.mb.destroy()

    // The relay only ever sees ciphertext.
    const stored = JSON.stringify([...relay.stored.values()])
    expect(stored).not.toContain('eggs')
    expect(stored).not.toContain(SLUG)

    const b = device()
    await b.mb.start(false)
    await until(() => allItems(b.ld).length === 2)
    expect(names(b.ld)).toEqual(['bread', 'eggs'])
  })

  it('merges instead of overwriting when both devices edited offline', async () => {
    const a = device()
    addItems(a.ld, parseMany('eggs'))
    await a.mb.start(true)
    await until(() => a.state() === 'saved')
    a.mb.destroy()

    // B already had its own items from an earlier visit.
    const b = device()
    addItems(b.ld, parseMany('milk'))
    await b.mb.start(true)
    await until(() => allItems(b.ld).length === 2 && b.state() === 'saved')

    const c = device()
    await c.mb.start(false)
    await until(() => allItems(c.ld).length === 2)
    expect(names(c.ld)).toEqual(['eggs', 'milk'])
  })

  it('passes later edits to devices that are already open', async () => {
    const a = device()
    const b = device()
    await Promise.all([a.mb.start(false), b.mb.start(false)])
    addItems(a.ld, parseMany('bananas'))
    await until(() => allItems(b.ld).length === 1)
    setDone(b.ld, allItems(b.ld)[0].id, true)
    await until(() => allItems(a.ld)[0].done)
  })

  it('does not republish a copy it has nothing to add to', async () => {
    const a = device()
    addItems(a.ld, parseMany('eggs'))
    await a.mb.start(true)
    await until(() => a.state() === 'saved')
    const first = [...relay.stored.values()][0].id

    const b = device()
    await b.mb.start(false)
    await until(() => b.state() === 'saved' && allItems(b.ld).length === 1)
    await new Promise((r) => setTimeout(r, 1200))
    expect([...relay.stored.values()][0].id).toBe(first)
  })

  it('asks relays to drop the copy 30 days after it was last refreshed', async () => {
    const a = device()
    addItems(a.ld, parseMany('eggs'))
    await a.mb.start(true)
    await until(() => a.state() === 'saved')
    const ev = [...relay.stored.values()][0]
    const expiry = Number(ev.tags.find((t) => t[0] === 'expiration')?.[1])
    expect(EXPIRY_SECONDS).toBe(30 * 24 * 60 * 60)
    expect(expiry - ev.created_at).toBe(EXPIRY_SECONDS)
  })

  it('ignores a copy that has expired but not yet been purged', async () => {
    const a = device()
    addItems(a.ld, parseMany('eggs'))
    await a.mb.start(true)
    await until(() => a.state() === 'saved')
    const ev = [...relay.stored.values()][0]
    ev.tags = ev.tags.map((t) =>
      t[0] === 'expiration' ? ['expiration', String(Math.floor(Date.now() / 1000) - 1)] : t,
    )

    const b = device()
    await b.mb.start(false)
    await until(() => b.state() === 'saved')
    expect(allItems(b.ld)).toHaveLength(0)
  })

  it('ignores copies it cannot decrypt', async () => {
    const a = device()
    await a.mb.start(false)
    addItems(a.ld, parseMany('eggs'))
    await until(() => a.state() === 'saved')
    const ev = [...relay.stored.values()][0] as Ev & { content: string }
    ev.content = 'v1:' + Buffer.from('not a real list, just junk').toString('base64')

    const b = device()
    await b.mb.start(false)
    await until(() => b.state() === 'saved')
    expect(allItems(b.ld)).toHaveLength(0)
  })

  it('flushNow sends a change straight away and waits for a relay to confirm it', async () => {
    const a = device()
    await a.mb.start(false)
    addItems(a.ld, parseMany('eggs'))
    expect(await a.mb.flushNow()).toBe(true)
    expect(relay.stored.size).toBe(1)

    const b = device()
    await b.mb.start(false)
    await until(() => allItems(b.ld).length === 1)
  })

  it('flushNow gives up when no relay will take the changes', async () => {
    relay.reject = true
    const a = device()
    await a.mb.start(false)
    addItems(a.ld, parseMany('eggs'))
    expect(await a.mb.flushNow(500)).toBe(false)
  })

  it('says so when no relay will take the changes', async () => {
    relay.reject = true
    const a = device()
    await a.mb.start(false)
    addItems(a.ld, parseMany('eggs'))
    await until(() => a.state() === 'unreachable')
    expect(a.states).toContain('sending')
  })
})
