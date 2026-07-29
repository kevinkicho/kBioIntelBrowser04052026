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

  test('source coverage can show empty toggle when zeros exist', async ({ page }) => {
    await page.goto('/molecule/2244')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 90_000 })
    const strip = page.getByTestId('molecule-cross-source').or(page.getByTestId('cross-source-strip'))
    // Strip may take a moment while categories hydrate
    const stripEl = strip.first()
    await expect(stripEl).toBeVisible({ timeout: 90_000 })

    // Full-page loading overlay blocks pointer events until categories settle
    const overlay = page.getByTestId('loading-overlay')
    if (await overlay.isVisible().catch(() => false)) {
      await expect(overlay).toBeHidden({ timeout: 120_000 })
    }

    // Prefer strip-scoped toggle (data hub also has *-toggle-empty)
    const toggle = page
      .getByTestId('molecule-cross-source-toggle-empty')
      .or(page.getByTestId('cross-source-strip-toggle-empty'))
      .or(page.getByTestId(/toggle-empty/))
    if (await toggle.first().isVisible().catch(() => false)) {
      await toggle.first().click({ timeout: 30_000 })
      await expect(stripEl).toHaveAttribute('data-hide-empty', 'false')
    }
  })
})
