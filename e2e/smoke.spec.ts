import { test, expect } from '@playwright/test'

test.describe('BioIntel smoke', () => {
  test('homepage renders title, search bar, and example chips', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /BioIntel Explorer/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search/i).first()).toBeVisible()
    // Example chips for molecule mode
    await expect(page.getByRole('link', { name: /aspirin/i }).first()).toBeVisible()
  })

  test('molecule profile loads (aspirin CID 2244) and shows AI copilot fab', async ({ page }) => {
    await page.goto('/molecule/2244')
    // Sticky header has the breadcrumb chip
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 60_000 })
    // Copilot fab should be in the DOM (may be disabled while loading)
    await expect(page.locator('button[title*="Copilot" i]')).toBeVisible()
    // Cite, Share, Export buttons render. Share uses aria-label="Share" so
    // its accessible name doesn't include the dropdown arrow.
    await expect(page.getByRole('button', { name: /Cite ▼/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Share$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Export ▼/ })).toBeVisible()
  })

  test('AI copilot fab is disabled while data loads, then enables', async ({ page }) => {
    await page.goto('/molecule/2244')
    const fab = page.locator('button[title*="Copilot" i]')
    await expect(fab).toBeVisible()
    // Initially disabled (no data loaded yet)
    await expect(fab).toBeDisabled({ timeout: 5_000 })
    // Once at least one category loads, fab becomes enabled
    await expect(fab).toBeEnabled({ timeout: 60_000 })
  })

  test('hypothesis page renders the filter UI', async ({ page }) => {
    await page.goto('/hypothesis')
    await expect(page.getByRole('heading', { name: /Hypothesis/i })).toBeVisible()
    // Two filter slots
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('cohort page renders the picker', async ({ page }) => {
    await page.goto('/cohort')
    await expect(page.getByRole('heading', { name: /Cohort/i })).toBeVisible()
  })

  test('analytics page loads', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page).toHaveURL(/\/analytics/)
  })

  test('embed mode strips the chrome', async ({ page }) => {
    await page.goto('/embed/molecule/2244?panels=summary,structure')
    // Embed should NOT show the Cite/Share/Export buttons (those are header chrome)
    await expect(page.getByRole('button', { name: /Cite ▼/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Share ▼/ })).toHaveCount(0)
    // Embed SHOULD show the floating "View full profile" link
    await expect(page.getByRole('link', { name: /View full profile/i })).toBeVisible({ timeout: 60_000 })
  })
})
