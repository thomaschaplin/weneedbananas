import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  // No retries: a flaky test should fail visibly rather than pass on a second try.
  retries: 0,
  forbidOnly: CI,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    launchOptions: {
      // Let two local browser contexts reach each other over WebRTC host candidates.
      args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
    },
  },
  // Serves the built site from dist/, so run `npm run build` first.
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !CI,
  },
})
