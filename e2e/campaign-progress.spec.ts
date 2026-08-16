/**
 * Campaign workspace auto-progress from product-event queue.
 * Runs under fixture suite (no network rank required).
 */
import { test, expect } from '@playwright/test'

test.describe('Campaign stages from product events', () => {
  test('auto-marks rank/pack/RH stages from queued events', async ({ page }) => {
    await page.addInitScript(() => {
      const events = [
        {
          name: 'discover_started',
          ts: new Date().toISOString(),
          props: { targetCount: 2 },
        },
        {
          name: 'discover_rank_completed',
          ts: new Date().toISOString(),
          props: { count: 8, ms: 900 },
        },
        {
          name: 'board_status_changed',
          ts: new Date().toISOString(),
          props: { status: 'promote', candidateId: 'c1' },
        },
        {
          name: 'pack_exported',
          ts: new Date().toISOString(),
          props: { count: 10, citable: 4 },
        },
        {
          name: 'research_hypothesis_opened',
          ts: new Date().toISOString(),
          props: { hypId: 'h1' },
        },
        {
          name: 'ui_surface_action',
          ts: new Date().toISOString(),
          props: { surface: 'monday_pack', action: 'export' },
        },
      ]
      localStorage.setItem('biointel-product-events-v1', JSON.stringify(events))
    })

    await page.goto('/campaign')
    await expect(page.getByTestId('campaign-workspace')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('loop-coach-strip')).toBeVisible()
    await expect(page.getByTestId('campaign-run-golden')).toBeVisible()
    await expect(page.getByTestId('campaign-stage-rank_shortlist')).toHaveAttribute(
      'data-done',
      'true',
    )
    await expect(page.getByTestId('campaign-stage-evidence_pack')).toHaveAttribute(
      'data-done',
      'true',
    )
    await expect(page.getByTestId('campaign-stage-research_hypothesis')).toHaveAttribute(
      'data-done',
      'true',
    )
    await expect(page.getByTestId('campaign-stage-monday_experiment')).toHaveAttribute(
      'data-done',
      'true',
    )
    await expect(page.getByTestId('campaign-stage-badge-rank_shortlist')).toContainText(/Auto/i)
    await expect(page.getByTestId('campaign-progress')).toContainText(/auto/i)
  })
})
