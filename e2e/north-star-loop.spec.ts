/**
 * North-star loop e2e (v2.1).
 *
 * Fixture mode (E2E_FIXTURE=1): stubs rank + molecule category APIs.
 * Full loop covers: discover → save → board → pack download → RH rehydrate (IDB).
 *
 * Requires running app unless Playwright webServer is enabled:
 *   npm run dev   # port 33424
 *   npm run test:e2e:fixture
 */
import { test, expect, type Page } from '@playwright/test'
import {
  CATEGORY_FIXTURE_MECHANISMS,
  CLAIM_ID,
  HYP_ID,
  PACK_ID,
  PROJECT_ID,
  RANK_FIXTURE,
  makeFixtureHypothesis,
  makeFixturePack,
  makeFixtureProject,
} from './fixtures/northStar'

const FIXTURE = process.env.E2E_FIXTURE === '1' || process.env.E2E_FIXTURE === 'true'

async function stubDiscoveryApis(page: Page) {
  // Broad match — clientFetch uses relative `/api/discover/rank`
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

  await page.route(/\/api\/molecule\/\d+\/category\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CATEGORY_FIXTURE_MECHANISMS),
    })
  })

  await page.route(/\/api\/discover\/harvest/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ candidates: [] }),
    })
  })

  // Rare boost may fire if prefs enabled; never hang
  await page.route(/\/api\/orphanet\//, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ genes: ['TTR'], orphaCode: '70', diseaseName: 'ATTR amyloidosis' }),
    })
  })

  // Best-effort analytics must not block
  await page.route(/\/api\/analytics/, async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })
}

/** Navigate to discover and force a fixture rank (URL bootstrap can race Strict Mode). */
async function discoverWithFixture(page: Page, q = 'ATTR amyloidosis') {
  await page.goto(`/discover?q=${encodeURIComponent(q)}`)
  await expect(page.getByPlaceholder(/What disease/i)).toBeVisible({ timeout: 30_000 })

  const rankWait = page.waitForResponse(
    (r) => r.url().includes('/api/discover/rank') && r.request().method() === 'POST',
    { timeout: 45_000 },
  )
  // Explicit submit — reliable even if deep-link bootstrap was aborted by Strict Mode
  const input = page.getByPlaceholder(/What disease/i)
  await input.fill(q)
  await page.getByRole('button', { name: /^Discover$/i }).click()
  const res = await rankWait
  expect(res.ok(), `rank status ${res.status()}`).toBeTruthy()
  await expect(page.getByTestId('candidate-card').first()).toBeVisible({ timeout: 30_000 })
}

/**
 * Seed local project + RH + pack index, and full pack into IndexedDB for rehydrate.
 */
async function seedBoardAndPack(page: Page) {
  const project = makeFixtureProject()
  const hyp = makeFixtureHypothesis()
  const pack = makeFixturePack()

  await page.addInitScript(
    ({ project, hyp, projectId, hypId }) => {
      try {
        localStorage.setItem('biointel-project-index-v1', JSON.stringify([projectId]))
        localStorage.setItem(`biointel-project-v1-${projectId}`, JSON.stringify(project))
        localStorage.setItem(
          `biointel-research-hypothesis-v1-${hypId}`,
          JSON.stringify(hyp),
        )
      } catch {
        // ignore
      }
    },
    { project, hyp, projectId: PROJECT_ID, hypId: HYP_ID },
  )

  // Land on origin first so IDB is same-origin
  await page.goto('/projects')
  await page.evaluate(async (packPayload) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('biointel-packs', 1)
      req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('packs')) {
          const store = db.createObjectStore('packs', { keyPath: 'id' })
          try {
            store.createIndex('accessedAt', 'accessedAt', { unique: false })
          } catch {
            // index may already exist on upgrade path
          }
        }
      }
      req.onsuccess = () => {
        const db = req.result
        try {
          const tx = db.transaction('packs', 'readwrite')
          tx.objectStore('packs').put({
            id: packPayload.id,
            pack: packPayload,
            accessedAt: new Date().toISOString(),
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error ?? new Error('IDB put failed'))
        } catch (e) {
          reject(e)
        }
      }
    })
  }, pack)
}

test.describe('North-star loop', () => {
  test.beforeEach(async ({ page }) => {
    if (FIXTURE) {
      await stubDiscoveryApis(page)
    }
  })

  test('discover page loads and can start search UI', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByTestId('discover-sessions')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('fixture rank shows candidates and trust banner', async ({ page }) => {
    test.skip(!FIXTURE, 'Set E2E_FIXTURE=1 for stubbed rank path')
    await discoverWithFixture(page)
    await expect(page.getByText(/ATTR amyloidosis/i).first()).toBeVisible()
    await expect(page.getByText(/Tafamidis/i).first()).toBeVisible()
    await expect(page.getByTestId('score-trust-banner')).toBeVisible()
  })

  test('discover → save to new project → board shows candidate', async ({ page }) => {
    test.skip(!FIXTURE, 'Set E2E_FIXTURE=1 for stubbed rank path')

    await discoverWithFixture(page)

    await page.getByTestId('save-to-project').first().click()
    await page.getByTestId('save-to-project-new').click()
    await expect(page.getByText(/Created project|Saved to project/i).first()).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/projects')
    await expect(page.getByRole('link', { name: /ATTR amyloidosis board|E2E|ATTR/i }).first()).toBeVisible({
      timeout: 30_000,
    })
    await page.getByRole('link', { name: /Open board/i }).first().click()

    await expect(page.getByText(/Tafamidis/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('pack-builder')).toBeVisible({ timeout: 30_000 })
  })

  test('board pack download updates pack index; seed RH', async ({ page }) => {
    test.skip(!FIXTURE, 'Set E2E_FIXTURE=1')

    // Seed a project with promote CID so PackBuilder + board fetch work without Discover
    const project = makeFixtureProject()
    // Fresh packIndex empty so download creates the entry
    project.packIndex = []
    project.researchHypothesisIds = []

    await page.addInitScript(
      ({ project, projectId }) => {
        localStorage.setItem('biointel-project-index-v1', JSON.stringify([projectId]))
        localStorage.setItem(`biointel-project-v1-${projectId}`, JSON.stringify(project))
      },
      { project, projectId: PROJECT_ID },
    )

    await page.goto(`/projects/${PROJECT_ID}`)
    await expect(page.getByTestId('pack-builder')).toBeVisible({ timeout: 60_000 })
    // Wait for panel fetch to settle (fixtures return immediately)
    await page.waitForTimeout(1500)

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await page.getByTestId('pack-download-json').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/i)

    // After download, pack index entry + seed button
    await expect(page.getByText(/E2E ATTR board evidence pack|evidence pack/i).first()).toBeVisible({
      timeout: 15_000,
    })
    const seedBtn = page.locator('[data-testid^="seed-rh-"]').first()
    await expect(seedBtn).toBeVisible({ timeout: 15_000 })
    await seedBtn.click()
    await expect(page.getByText(/Seeded research hypothesis/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('research-hypotheses-list')).toBeVisible()
    await page.locator('[data-testid^="rh-edit-"]').first().click()
    await expect(page).toHaveURL(/\/hypothesis\//)
    await expect(page.getByText(/Research hypothesis/i)).toBeVisible()
  })

  test('RH rehydrate loads claim statements from IDB pack cache', async ({ page }) => {
    test.skip(!FIXTURE, 'Set E2E_FIXTURE=1')

    await seedBoardAndPack(page)

    await page.goto(`/projects/${PROJECT_ID}/hypothesis/${HYP_ID}`)
    await expect(page.getByText(/Research hypothesis/i)).toBeVisible({ timeout: 30_000 })
    // IDB rehydrate should show statement (not bare claim id list only)
    await expect(page.getByTestId('rehydrated-claims')).toBeVisible({ timeout: 30_000 })
    await expect(
      page.getByText(/Tafamidis stabilizes TTR|fixture claim for e2e/i),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(CLAIM_ID)).toBeVisible()
    // Source label
    await expect(page.getByText(/pack cache \(IndexedDB\)|rebuilt from Core/i)).toBeVisible({
      timeout: 10_000,
    })
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
