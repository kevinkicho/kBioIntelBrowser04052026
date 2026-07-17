import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT || 33424
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`
/** When E2E_WEBSERVER=1, Playwright starts `npm run dev` automatically. */
const USE_WEBSERVER =
  process.env.E2E_WEBSERVER === '1' || process.env.E2E_WEBSERVER === 'true'

export default defineConfig({
  testDir: './e2e',
  // Generous timeouts — dev-mode first compiles can take 30-90s on this app.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  ...(USE_WEBSERVER
    ? {
        webServer: {
          command: `npx next dev -p ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      }
    : {}),
})

