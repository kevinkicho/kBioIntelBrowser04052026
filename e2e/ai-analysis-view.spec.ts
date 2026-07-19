/**
 * Discover AI analysis view UI (fixture rank, no Ollama required).
 * Covers disclaimer + toggle affordances (non-of-record plane).
 */
import { test, expect, type Page } from '@playwright/test'
import { RANK_FIXTURE } from './fixtures/northStar'

const FIXTURE = process.env.E2E_FIXTURE === '1' || process.env.E2E_FIXTURE === 'true'

async function stubRank(page: Page) {
  await page.route(/\/api\/discover\/rank(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(RANK_FIXTURE),
      })
      return
    }
    await route.continue()
  })
  await page.route(/\/api\/analytics/, async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })
  await page.route(/\/api\/discover\/harvest/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [] }),
    })
  })
}

test.describe('Discover AI analysis view', () => {
  test.skip(!FIXTURE, 'Set E2E_FIXTURE=1')

  test('disclaimer and of-record / analysis toggle', async ({ page }) => {
    await stubRank(page)
    await page.goto('/discover?q=ATTR%20amyloidosis')
    await expect(page.getByPlaceholder(/What disease/i)).toBeVisible({ timeout: 30_000 })

    const rankWait = page.waitForResponse(
      (r) => r.url().includes('/api/discover/rank') && r.request().method() === 'POST',
      { timeout: 45_000 },
    )
    await page.getByRole('button', { name: /Discover|Search|Rank/i }).first().click().catch(async () => {
      // fallback: press Enter in disease field
      await page.getByPlaceholder(/What disease/i).press('Enter')
    })
    await rankWait.catch(() => undefined)

    // Wait for candidates or analysis UI
    await expect(page.getByTestId('ai-analysis-view')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('ai-view-of-record')).toBeVisible()
    await expect(page.getByTestId('ai-view-analysis')).toBeVisible()

    // Analysis disabled until disclaimer
    await expect(page.getByTestId('ai-view-analysis')).toBeDisabled()
    await expect(page.getByTestId('ai-analysis-disclaimer')).toBeVisible()
    await page.getByTestId('ai-analysis-disclaimer-ack').click()
    await expect(page.getByTestId('ai-view-analysis')).toBeEnabled()

    // Toggle analysis — may show connect-Ollama without running model
    await page.getByTestId('ai-view-analysis').click()
    await expect(page.getByTestId('ai-analysis-banner')).toBeVisible()
    await expect(page.getByTestId('discover-ai-prompt')).toBeVisible()

    // Back to of-record
    await page.getByTestId('ai-view-of-record').click()
    await expect(page.getByTestId('ai-analysis-banner')).toHaveCount(0)
  })
})
