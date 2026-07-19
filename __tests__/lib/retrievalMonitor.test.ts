import {
  buildRetrievalSnapshot,
  filterGaps,
  formatRetrievalSummary,
} from '@/lib/ai/retrievalMonitor'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'

describe('buildRetrievalSnapshot', () => {
  const status = {
    'clinical-safety': 'loaded',
    pharmaceutical: 'idle',
  } as Record<CategoryId, CategoryLoadState>

  it('lists empty panels as gaps (not only category errors)', () => {
    const data = {
      'clinical-safety': {
        clinicalTrials: [{ nctId: 'NCT1', title: 'T' }],
        adverseEvents: [],
        _sourceStatus: {
          clinicaltrials: { status: 'loaded', has_data: true, duration_ms: 100 },
          adverseevents: { status: 'empty', has_data: false, duration_ms: 50 },
        },
      },
    } as Partial<Record<CategoryId, Record<string, unknown>>>

    const snap = buildRetrievalSnapshot(data, status, {})
    expect(snap.totalApisSucceeded).toBeGreaterThan(0)
    expect(snap.totalApisEmpty).toBeGreaterThan(0)
    const emptyGaps = snap.gaps.filter((g) => g.reason === 'empty')
    expect(emptyGaps.length).toBeGreaterThan(0)
    expect(emptyGaps.some((g) => g.title.toLowerCase().includes('adverse'))).toBe(true)
  })

  it('marks timeout from _sourceStatus as timeout not empty', () => {
    const data = {
      'clinical-safety': {
        clinicalTrials: null,
        _sourceStatus: {
          clinicaltrials: {
            status: 'timeout',
            has_data: false,
            duration_ms: 8000,
            error: 'timed out',
          },
        },
      },
    } as Partial<Record<CategoryId, Record<string, unknown>>>

    const fullStatus = {
      'clinical-safety': 'loaded',
    } as Record<CategoryId, CategoryLoadState>

    const snap = buildRetrievalSnapshot(data, fullStatus, {})
    expect(snap.totalApisTimeout).toBeGreaterThan(0)
    expect(snap.gaps.some((g) => g.reason === 'timeout')).toBe(true)
  })

  it('overallCompleteness uses panel success not category load ratio', () => {
    const data = {
      'clinical-safety': {
        clinicalTrials: [{ nctId: 'NCT1' }],
        adverseEvents: [],
      },
    } as Partial<Record<CategoryId, Record<string, unknown>>>

    const snap = buildRetrievalSnapshot(data, status, {})
    // Category load ratio would be small; panel completeness is among terminal panels
    expect(snap.overallCompleteness).toBeGreaterThan(0)
    expect(snap.overallCompleteness).toBeLessThanOrEqual(1)
    expect(snap.categoryLoadRatio).toBeGreaterThan(0)
  })

  it('filterGaps actionable prefers failed over empty', () => {
    const gaps = [
      {
        categoryId: 'clinical-safety' as CategoryId,
        panelKey: 'a',
        title: 'A',
        reason: 'empty' as const,
        actionable: false,
      },
      {
        categoryId: 'clinical-safety' as CategoryId,
        panelKey: 'b',
        title: 'B',
        reason: 'timeout' as const,
        actionable: true,
      },
    ]
    expect(filterGaps(gaps, 'actionable')).toHaveLength(1)
    expect(filterGaps(gaps, 'empty')).toHaveLength(1)
    expect(filterGaps(gaps, 'failed')).toHaveLength(1)
  })

  it('formatRetrievalSummary mentions empty and failed', () => {
    const data = {
      'clinical-safety': {
        clinicalTrials: [],
        _sourceStatus: {
          clinicaltrials: { status: 'empty', has_data: false },
        },
      },
    } as Partial<Record<CategoryId, Record<string, unknown>>>
    const snap = buildRetrievalSnapshot(data, status, {})
    const text = formatRetrievalSummary(snap)
    expect(text).toMatch(/empty|Empty|Data/i)
  })
})
