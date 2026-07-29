import { test, expect } from '@playwright/test'

/**
 * Full-app surface tour — every major route mounts expected chrome.
 * Live network OK; timeouts generous for free APIs.
 */

const ROUTES: { path: string; expectText: RegExp | string; name: string }[] = [
  { path: '/', name: 'home', expectText: /BioIntel/i },
  { path: '/discover', name: 'discover', expectText: /Discover|disease|target/i },
  { path: '/methodology', name: 'methodology', expectText: /How BioIntel presents|honesty|Data hub/i },
  { path: '/how-it-works', name: 'how-it-works', expectText: /how|algorithm|AI|Discover/i },
  { path: '/hypothesis', name: 'hypothesis', expectText: /Hypothesis/i },
  { path: '/cohort', name: 'cohort', expectText: /Cohort/i },
  { path: '/compare', name: 'compare', expectText: /Compare|molecule/i },
  { path: '/analytics', name: 'analytics', expectText: /Analytics|metric|API/i },
  { path: '/browse', name: 'browse', expectText: /Browse|category|source/i },
  { path: '/projects', name: 'projects', expectText: /Project|board|pack/i },
  { path: '/watchlist', name: 'watchlist', expectText: /Watchlist|favorite/i },
  { path: '/batch', name: 'batch', expectText: /Batch|CID|upload/i },
  { path: '/orgs', name: 'orgs', expectText: /org|lab|institution|ROR/i },
  { path: '/disease', name: 'disease', expectText: /Disease|search/i },
  { path: '/ai-history', name: 'ai-history', expectText: /AI|history|generation/i },
]

test.describe('full-app route surface', () => {
  for (const r of ROUTES) {
    test(`route ${r.name} (${r.path}) mounts`, async ({ page }) => {
      await page.goto(r.path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toContainText(r.expectText, { timeout: 45_000 })
      // No uncaught React crash banner
      await expect(page.getByText(/Minified React error/i)).toHaveCount(0)
      await expect(page.getByText(/Something went wrong/i)).toHaveCount(0)
    })
  }
})

test.describe('full-app molecule chrome', () => {
  test('aspirin profile: hub, coverage, header actions, copilot fab', async ({ page }) => {
    await page.goto('/molecule/2244')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 90_000 })

    // Header actions — unique testids (avoid data-hub row "Cite" buttons)
    await expect(page.getByTestId('profile-cite-button')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('profile-share-button')).toBeVisible()
    await expect(page.getByTestId('profile-export-button')).toBeVisible()

    // Data hub
    const hub = page.getByTestId('molecule-data-hub').or(page.getByTestId('data-hub-ledger'))
    await expect(hub.first()).toBeVisible({ timeout: 60_000 })

    // Source coverage
    await expect(page.getByText(/Source coverage/i).first()).toBeVisible({ timeout: 60_000 })

    // AI copilot fab (aria-label + testid; no title= on the button)
    await expect(page.getByTestId('ai-copilot-fab')).toBeVisible({ timeout: 30_000 })
  })

  test('research view shows research tables prefs chrome', async ({ page }) => {
    await page.goto('/molecule/2244?view=research')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 90_000 })
    await expect(
      page.getByText(/Research view|Literature|Data hub/i).first(),
    ).toBeVisible({ timeout: 60_000 })
  })
})

test.describe('full-app diagnostics', () => {
  test('runtime-config API returns safe booleans only', async ({ request }) => {
    const res = await request.get('/api/runtime-config')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.firebaseClient).toBe('boolean')
    expect(JSON.stringify(json)).not.toMatch(/BEGIN PRIVATE|sk-[a-zA-Z0-9]{10,}/)
  })
})
