import {
  buildCategoryApiTrace,
  categoryForPanel,
  enrichSourceTrace,
  filterTraceForPanel,
} from '@/lib/panelApiTrace'

describe('panelApiTrace', () => {
  it('maps panel to category', () => {
    expect(categoryForPanel('clinical-trials')).toBe('clinical-safety')
    expect(categoryForPanel('companies')).toBe('pharmaceutical')
    expect(categoryForPanel('nope')).toBeNull()
  })

  it('enriches source with endpoint metadata when known', () => {
    const t = enrichSourceTrace({
      source: 'clinicaltrials',
      status: 200,
      duration_ms: 120,
      has_data: true,
      loadStatus: 'loaded',
    })
    expect(t.panelId).toBe('clinical-trials')
    expect(t.endpoint).toBeTruthy()
    expect(t.apiLabel).toMatch(/ClinicalTrials/i)
  })

  it('builds category trace summary', () => {
    const trace = buildCategoryApiTrace({
      categoryId: 'clinical-safety',
      cid: 2244,
      moleculeName: 'Aspirin',
      requestPath: '/api/molecule/2244/category/clinical-safety',
      startedAt: '2026-07-16T12:00:00.000Z',
      finishedAt: '2026-07-16T12:00:01.500Z',
      fromCache: false,
      forceRefresh: true,
      metrics: [
        {
          source: 'clinicaltrials',
          status: 200,
          duration_ms: 100,
          has_data: true,
          loadStatus: 'loaded',
        },
        {
          source: 'adverseevents',
          status: 200,
          duration_ms: 200,
          has_data: false,
          loadStatus: 'empty',
        },
      ],
      dataKeys: ['clinicalTrials', 'adverseEvents', '_sourceStatus'],
    })
    expect(trace.duration_ms).toBe(1500)
    expect(trace.responseSummary.withData).toBe(1)
    expect(trace.forceRefresh).toBe(true)
  })

  it('filterTraceForPanel falls back to full category when no match', () => {
    const trace = buildCategoryApiTrace({
      categoryId: 'clinical-safety',
      cid: 1,
      requestPath: '/x',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      fromCache: false,
      forceRefresh: false,
      metrics: [
        {
          source: 'clinicaltrials',
          status: 200,
          duration_ms: 1,
          has_data: true,
          loadStatus: 'loaded',
        },
      ],
      dataKeys: [],
    })
    const filtered = filterTraceForPanel(trace, 'clinical-trials')
    expect(filtered?.sources).toHaveLength(1)
    const full = filterTraceForPanel(trace, 'unknown-panel')
    expect(full?.sources.length).toBeGreaterThanOrEqual(1)
  })
})
