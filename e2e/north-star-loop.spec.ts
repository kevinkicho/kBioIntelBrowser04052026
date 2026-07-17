/**
 * North-star loop e2e (v2.1 V21-02).
 * Default: fixture mode (E2E_FIXTURE=1) stubs rank + avoids live free-API flakiness.
 * Requires running app: npm run dev (playwright has no webServer by default).
 */
import { test, expect } from '@playwright/test'

const FIXTURE = process.env.E2E_FIXTURE === '1' || process.env.E2E_FIXTURE === 'true'

const RANK_FIXTURE = {
  diseaseName: 'ATTR amyloidosis',
  diseaseId: 'EFO_FIXTURE_ATTR',
  candidates: [
    {
      name: 'Tafamidis',
      compositeScore: 0.82,
      clinicalPhase: 4,
      confidence: 'high',
    },
  ],
  genes: [{ symbol: 'TTR', score: 0.9 }],
  therapeuticAreas: ['rare'],
  sourceStatuses: [],
  v2: {
    scorePhase: 'cheap',
    needsDiseaseConfirmation: false,
    timingMs: { disease: 10, cheapScore: 20, total: 100 },
    candidates: [
      {
        candidateId: 'cid:fixture-1',
        identity: {
          name: 'Tafamidis',
          synonyms: [],
          pubchemCid: 208901,
          identityTrust: 'high',
        },
        origins: ['chembl-indication'],
        evidenceBreadthSources: ['ChEMBL'],
        links: [],
        scores: {
          composite: 0.82,
          axes: {
            efficacy: 0.8,
            clinicalStage: 0.9,
            safety: null,
            novelty: 0.4,
            identityTrust: 0.9,
          },
          axisStatus: {
            efficacy: 'ok',
            clinicalStage: 'ok',
            safety: 'not-retrieved',
            novelty: 'ok',
            identityTrust: 'ok',
          },
          rubricVersion: 1,
          scorePhase: 'cheap',
        },
      },
    ],
  },
}

test.describe('North-star discover → board path', () => {
  test.beforeEach(async ({ page }) => {
    if (FIXTURE) {
      await page.route('**/api/discover/rank', async (route) => {
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
    }
  })

  test('discover page loads and can start search UI', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByTestId('discover-sessions')).toBeVisible({ timeout: 30_000 })
    // Hero / search surface
    await expect(page.locator('main')).toBeVisible()
  })

  test('fixture rank shows candidates and pin UI', async ({ page }) => {
    test.skip(!FIXTURE, 'Set E2E_FIXTURE=1 for stubbed rank path')
    await page.goto('/discover?q=ATTR+amyloidosis')
    // Bootstrapped search from URL
    await expect(page.getByText(/ATTR amyloidosis/i).first()).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByText(/Tafamidis/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('score-trust-banner')).toBeVisible()
  })

  test('projects list page loads', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/projects/)
  })

  test('analytics shows product funnel panel', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page.getByTestId('product-funnel-panel')).toBeVisible({ timeout: 30_000 })
  })
})
