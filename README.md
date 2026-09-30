# weneedbananas

A shared shopping list at **weneedbananas.com** with no signup and no backend. A list is three random words (`weneedbananas.com/lemon.fork.bulb`); anyone with the words is on the list.

## How it works

- **No server stores lists.** Each device keeps the full list in IndexedDB ([Yjs](https://yjs.dev) CRDT + `y-indexeddb`).
- **Peer-to-peer sync.** Devices with the same list open connect over WebRTC via [Trystero](https://github.com/dmotz/trystero), using public Nostr relays for signaling only. The words go through PBKDF2 (600k rounds) on-device to produce the room id and the handshake password, so the relays never see the words or the items.
- **Trade-off:** two devices must have the list open at the same time to exchange changes. Offline edits merge cleanly when they meet. The UI shows sync state at all times.

## Shopping features

Auto aisle grouping (`src/lib/aisles.ts`) with a per-list aisle order, quantity parsing and duplicate merging (`src/lib/parse.ts`), a Shop mode (wake lock, big targets, progress), "couldn't find it", "done shopping" with undo, usuals, paste-a-recipe, "someone's at the shop" presence, and offline PWA.

## SEO / AEO / privacy

- `/`, `/how-it-works` and `/privacy` are prerendered at build time (`scripts/prerender.tsx`, run before the service worker is generated so its precache sees the final HTML) with JSON-LD (WebApplication, FAQPage, Article). `public/llms.txt`, `robots.txt` and `sitemap.xml` are included.
- `404.html` (served by Vercel for unknown paths, with a "did you mean this list?" hint) and `offline.html` (shown by the service worker when an uncached page can't load) are prerendered and `noindex`. The 404 reports itself to analytics as `/404` so a mistyped list name never leaves the device.
- List pages (`/word.word.word` → `list.html`) are `noindex` via meta tag **and** `X-Robots-Tag`, are disallowed in `robots.txt`, are excluded from the sitemap, and send `Referrer-Policy: no-referrer` (see `vercel.json`).

## Development

```sh
npm install
npm run dev        # http://localhost:5173/lemon.fork.bulb works in dev too
npm test           # unit tests (parser, aisles, slugs, CRDT merge)
npm run build      # typecheck + vite build + prerender
npm run test:e2e   # Playwright against the built site, incl. two-device WebRTC sync with a mock relay
npm run images     # regenerate icons and og.png
```

## Deploying

Import the repo into Vercel (framework preset: Vite). `vercel.json` sets the build, rewrites and headers. Then add the `weneedbananas.com` domain.
