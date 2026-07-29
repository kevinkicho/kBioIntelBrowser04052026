/**
 * Research tool surfacing e2e (playbook tips + loop strip).
 * Fixture-friendly: does not require live free APIs for the Discover idle tips.
 */
import { test, expect } from '@playwright/test'

test.describe('research tool surfaces', () => {
  test('Discover idle shows research playbook tips', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByTestId('research-playbook-tips-discover-idle')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByTestId('playbook-tip-disease_to_shortlist')).toBeVisible()
    // One-click run action
    const run = page.getByTestId('playbook-tip-run-disease_to_shortlist')
    if (await run.isVisible()) {
      await run.click()
    }
  })

  test('how-it-works tools tab opens', async ({ page }) => {
    await page.goto('/how-it-works#tools')
    await expect(page.getByTestId('how-tools')).toBeVisible({ timeout: 30_000 })
  })

  test('methodology kit-diff panel present', async ({ page }) => {
    await page.goto('/methodology#kit-diff')
    await expect(page.getByTestId('research-kit-diff')).toBeVisible({ timeout: 30_000 })
  })
})
