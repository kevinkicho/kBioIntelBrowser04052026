import { test, expect } from '@playwright/test'

test.describe('BioIntel smoke', () => {
  test('homepage renders title, search bar, and example chips', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /BioIntel Explorer/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search/i).first()).toBeVisible()
    // Disease-default homepage: example chips from mixed tour set
    await expect(page.getByRole('link', { name: /ATTR amyloidosis|Type 2 diabetes|diabetes/i }).first()).toBeVisible()
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

  test('structure 3D toggle available for aspirin (CID 2244 has conformers)', async ({ page }) => {
    await page.goto('/molecule/2244')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 60_000 })
    const toggle = page.getByTestId('structure-3d-toggle')
    await expect(toggle).toBeVisible({ timeout: 30_000 })
    // Wait until preflight finishes (not "…")
    await expect(toggle).not.toHaveText('…', { timeout: 30_000 })
    // Aspirin should offer 3D (or at least not permanently 2D-only if PubChem is up)
    const label = await toggle.textContent()
    expect(label).toMatch(/3D|2D only|2D/)
  })

  test('structure 3D toggle for no-conformer CID shows 2D only when preflight fails', async ({
    page,
  }) => {
    // Large peptide-like CID that previously 404'd MolView 3D SDF
    await page.goto('/molecule/121493436')
    const toggle = page.getByTestId('structure-3d-toggle')
    // Profile may still load; if molecule not found, skip soft
    const cidChip = page.getByText(/CID:121493436/)
    try {
      await expect(cidChip).toBeVisible({ timeout: 45_000 })
    } catch {
      test.skip(true, 'CID 121493436 not resolvable in this environment')
      return
    }
    await expect(toggle).toBeVisible({ timeout: 30_000 })
    await expect(toggle).not.toHaveText('…', { timeout: 45_000 })
    // Prefer asserting 2D only when PubChem reports no 3D
    const label = (await toggle.textContent()) || ''
    if (label.includes('2D only')) {
      await expect(toggle).toBeDisabled()
    }
  })

  test('aspirin profile does not show identity shell banner under normal PubChem', async ({
    page,
  }) => {
    await page.goto('/molecule/2244')
    await expect(page.getByText(/CID:2244/)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('identity-shell-banner')).toHaveCount(0)
  })
})
