/// <reference types="vitest/config" />
import { defineConfig, type Connect } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const LIST_PATH = /^\/[a-z]+\.[a-z]+\.[a-z]+\/?(?:[?#].*)?$/i
const PAGES = [
  'how-it-works',
  'privacy',
  'offline',
  'shared-shopping-list-no-signup',
  'family-shopping-list',
  'shopping-list-app-alternatives',
]

const isFile = (path: string) =>
  path === '/' || ['public', 'dist', '.'].some((dir) => existsSync(resolve(import.meta.dirname, dir, `.${path}`)))

// Mirror vercel.json's rewrites, and Vercel serving 404.html for unknown pages, in `vite dev` and `vite preview`.
const rewrites: Connect.NextHandleFunction = (req, res, next) => {
  const url = req.url ?? '/'
  const path = url.split(/[?#]/)[0]
  if (LIST_PATH.test(url)) req.url = '/list.html'
  else if (PAGES.includes(path.slice(1))) req.url = `${path}.html`
  else if (req.headers.accept?.includes('text/html') && !isFile(path)) {
    req.url = '/404.html'
    // Vite's static and HTML handlers always answer 200, so pin the status.
    const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => typeof res
    res.writeHead = ((_status: number, ...rest: unknown[]) => writeHead(404, ...rest)) as typeof res.writeHead
    res.statusCode = 404
  }
  next()
}

export default defineConfig({
  plugins: [
    preact(),
    {
      name: 'wnb-rewrites',
      configureServer: (server) => void server.middlewares.use(rewrites),
      configurePreviewServer: (server) => void server.middlewares.use(rewrites),
    },
    {
      // Prerender the static pages before the service worker is generated, so its precache
      // revisions hash the final HTML and installed copies pick up content changes.
      name: 'wnb-prerender',
      apply: 'build',
      closeBundle: {
        order: 'pre',
        sequential: true,
        handler: () => void execFileSync('npx', ['tsx', 'scripts/prerender.tsx'], { stdio: 'inherit' }),
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      integration: { closeBundleOrder: 'post' },
      injectRegister: false,
      manifest: {
        name: 'We Need Bananas',
        short_name: 'Bananas',
        description: 'Shared shopping lists with no signup. Three words, one list, everyone in sync.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fffbea',
        theme_color: '#ffd23f',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['og.png'],
        // Any /word.word.word opens the (cached) app shell, so lists work offline.
        navigateFallback: '/list.html',
        navigateFallbackAllowlist: [/^\/[a-z]+\.[a-z]+\.[a-z]+\/?$/i],
        // Any other page that isn't precached: go to the network, and show the offline page if that fails.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: { precacheFallback: { fallbackURL: '/offline.html' } },
          },
        ],
      },
    }),
  ],
  test: {
    // e2e/ is Playwright's; `npm run test:e2e` runs it.
    include: ['tests/**/*.test.ts'],
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        list: resolve(import.meta.dirname, 'list.html'),
        'how-it-works': resolve(import.meta.dirname, 'how-it-works.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        404: resolve(import.meta.dirname, '404.html'),
        offline: resolve(import.meta.dirname, 'offline.html'),
        'shared-shopping-list-no-signup': resolve(import.meta.dirname, 'shared-shopping-list-no-signup.html'),
        'family-shopping-list': resolve(import.meta.dirname, 'family-shopping-list.html'),
        'shopping-list-app-alternatives': resolve(import.meta.dirname, 'shopping-list-app-alternatives.html'),
      },
    },
  },
})
