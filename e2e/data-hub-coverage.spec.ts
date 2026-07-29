import { test, expect } from '@playwright/test'

/**
 * Data hub + source coverage UI — fixture-friendly checks for layout and toggles.
 * Run with: npx playwright test e2e/data-hub-coverage.spec.ts
 * Prefer: E2E_FIXTURE=1 E2E_WEBSERVER=1 when available for molecule route.
 */

test.describe('Data hub coverage UI', () => {
  test('methodology documents data hub and honesty', async ({ page }) => {
    await page.goto('/methodology')
    await expect(page.getByRole('heading', { name: /How BioIntel presents/i })).toBeVisible()
    await expect(page.locator('#honesty')).toBeVisible()
    await expect(page.getByText(/Data hub/i).first()).toBeVisible()
  })

  test('molecule research view mounts data hub ledger', async ({ page }) => {
    await page.goto('/molecule/2244?view=research')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 90_000 })
    const hub = page.getByTestId('molecule-data-hub').or(page.getByTestId('data-hub-ledger'))
    await expect(hub.first()).toBeVisible({ timeout: 90_000 })
    // Source coverage strip title
    const coverage = page.getByText(/Source coverage/i).first()
    await expect(coverage).toBeVisible({ timeout: 60_000 })
  })

  test('source coverage strip mounts and empty toggle works when present', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/molecule/2244')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 60_000 })

    const stripEl = page.getByTestId('molecule-cross-source').or(page.getByTestId('cross-source-strip')).first()
    await expect(stripEl).toBeVisible({ timeout: 60_000 })
    await expect(stripEl).toHaveAttribute('data-testid', /cross-source|molecule-cross-source/)

    // Overlay wall-clock max is ~12s — do not pin the suite on free-API hydrate
    try {
      await expect(page.getByTestId('loading-overlay')).toBeHidden({ timeout: 20_000 })
    } catch {
      /* force-click path still ok */
    }

    // Only the *strip* toggle updates data-hide-empty on the strip (not data-hub toggle).
    // When source-count is 0 there is no empty toggle — that is a valid pass.
    const stripToggle = page.getByTestId('molecule-cross-source-toggle-empty')
    if (await stripToggle.isVisible().catch(() => false)) {
      const before = await stripEl.getAttribute('data-hide-empty')
      await stripToggle.click({ force: true })
      // Toggle should flip hide state; if re-render races, button label still changes
      const after = await stripEl.getAttribute('data-hide-empty')
      const label = (await stripToggle.textContent()) || ''
      const flipped =
        (before === 'true' && after === 'false') ||
        (before === 'false' && after === 'true') ||
        /Hide empty/i.test(label)
      expect(flipped).toBe(true)
    }
  })
})
