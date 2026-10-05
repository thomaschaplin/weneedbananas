import type { BrowserContext, WebSocketRoute } from '@playwright/test'

type Filter = { kinds?: number[]; authors?: string[]; ['#x']?: string[]; ['#d']?: string[] }
type NostrEvent = { id: string; pubkey: string; kind: number; created_at: number; tags: string[][] }

/**
 * A minimal in-memory Nostr relay. Every `wss://` connection from the given
 * browser contexts is routed here, so peers can signal without the internet.
 * Like real relays it keeps only the newest addressable event (kind 30000-39999)
 * per author and `d` tag, and forgets everything else once delivered.
 */
export class MockRelay {
  private subs = new Map<WebSocketRoute, Map<string, Filter[]>>()
  private stored = new Map<string, NostrEvent>()

  async attach(context: BrowserContext): Promise<void> {
    await context.routeWebSocket(/^wss:\/\//, (ws) => {
      this.subs.set(ws, new Map())
      ws.onMessage((raw) => this.handle(ws, String(raw)))
      ws.onClose(() => this.subs.delete(ws))
    })
  }

  private handle(ws: WebSocketRoute, raw: string) {
    const msg = JSON.parse(raw) as unknown[]
    const type = msg[0]
    if (type === 'REQ') {
      const [, subId, ...filters] = msg as [string, string, ...Filter[]]
      this.subs.get(ws)?.set(subId, filters)
      for (const ev of this.stored.values()) {
        if (filters.some((f) => matches(f, ev))) ws.send(JSON.stringify(['EVENT', subId, ev]))
      }
      ws.send(JSON.stringify(['EOSE', subId]))
    } else if (type === 'CLOSE') {
      this.subs.get(ws)?.delete(msg[1] as string)
    } else if (type === 'EVENT') {
      const ev = msg[1] as NostrEvent
      ws.send(JSON.stringify(['OK', ev.id, true, '']))
      if (ev.kind >= 30000 && ev.kind < 40000) {
        const key = `${ev.pubkey}:${ev.kind}:${tag(ev, 'd')}`
        const old = this.stored.get(key)
        if (!old || ev.created_at >= old.created_at) this.stored.set(key, ev)
      }
      for (const [client, subs] of this.subs) {
        for (const [subId, filters] of subs) {
          if (filters.some((f) => matches(f, ev))) client.send(JSON.stringify(['EVENT', subId, ev]))
        }
      }
    }
  }
}

const tag = (ev: NostrEvent, name: string) => ev.tags.find((t) => t[0] === name)?.[1]

function matches(f: Filter, ev: NostrEvent): boolean {
  if (f.kinds && !f.kinds.includes(ev.kind)) return false
  if (f.authors && !f.authors.includes(ev.pubkey)) return false
  const x = f['#x']
  if (x && !x.includes(tag(ev, 'x') ?? '')) return false
  const d = f['#d']
  if (d && !d.includes(tag(ev, 'd') ?? '')) return false
  return true
}
