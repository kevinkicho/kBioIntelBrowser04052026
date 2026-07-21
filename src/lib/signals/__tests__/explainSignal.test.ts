/**
 * @jest-environment node
 */

import { explainSignal, categoryIdForPanel } from '../explainSignal'
import { buildMoleculePanelDeepLink } from '../deepLink'

describe('explainSignal', () => {
  it('maps clinical-trials panel to clinical-safety tab', () => {
    expect(categoryIdForPanel('clinical-trials')).toBe('clinical-safety')
    expect(categoryIdForPanel('adverse-events')).toBe('clinical-safety')
    expect(categoryIdForPanel('literature')).toBe('research-literature')
  })

  it('explains new trial count without claiming AI', () => {
    const e = explainSignal(
      {
        key: 'clinicalTrials',
        panelId: 'clinical-trials',
        category: 'Clinical',
        label: 'clinical trials',
        type: 'new',
        count: 3,
        href: '/molecule/1#clinical-trials',
      },
      { moleculeName: 'Etoposide', snapshotAge: '2d ago' },
    )
    expect(e.headline).toMatch(/\+3/)
    expect(e.whyShowing).toMatch(/Etoposide/)
    expect(e.algorithm.toLowerCase()).toMatch(/deterministic/)
    expect(e.notAi.toLowerCase()).toMatch(/not ai/)
    expect(e.destination).toMatch(/clinical-trials/)
  })

  it('builds deep link with tab and panel query for stable navigation', () => {
    const href = buildMoleculePanelDeepLink(2244, 'clinical-trials', {
      projectId: 'proj1',
    })
    expect(href).toContain('/molecule/2244?')
    expect(href).toContain('tab=clinical-safety')
    expect(href).toContain('panel=clinical-trials')
    expect(href).toContain('project=proj1')
    expect(href.endsWith('#clinical-trials')).toBe(true)
  })
})
