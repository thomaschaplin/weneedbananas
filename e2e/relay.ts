import type { BrowserContext, WebSocketRoute } from '@playwright/test'

type Filter = { kinds?: number[]; ['#x']?: string[] }
type NostrEvent = { id: string; kind: number; tags: string[][] }

/**
 * A minimal in-memory Nostr relay. Every `wss://` connection from the given
 * browser contexts is routed here, so peers can signal without the internet.
 */
export class MockRelay {
  private subs = new Map<WebSocketRoute, Map<string, Filter[]>>()

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
      ws.send(JSON.stringify(['EOSE', subId]))
    } else if (type === 'CLOSE') {
      this.subs.get(ws)?.delete(msg[1] as string)
    } else if (type === 'EVENT') {
      const ev = msg[1] as NostrEvent
      ws.send(JSON.stringify(['OK', ev.id, true, '']))
      for (const [client, subs] of this.subs) {
        for (const [subId, filters] of subs) {
          if (filters.some((f) => matches(f, ev))) client.send(JSON.stringify(['EVENT', subId, ev]))
        }
      }
    }
  }
}

function matches(f: Filter, ev: NostrEvent): boolean {
  if (f.kinds && !f.kinds.includes(ev.kind)) return false
  const x = f['#x']
  if (x && !ev.tags.some((t) => t[0] === 'x' && x.includes(t[1]))) return false
  return true
}
