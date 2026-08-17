import {
  loadStatusFromPanelTrace,
  resolveCategoryFetchedAt,
  sourceStatusForPanel,
} from '@/lib/panelApiTrace'

describe('panelApiTrace accuracy helpers', () => {
  test('sourceStatusForPanel maps tracker keys to panel ids', () => {
    const map = {
      clinicaltrials: { status: 'timeout', error: 'upstream slow' },
      openfda: { status: 'error' },
    }
    expect(sourceStatusForPanel(map, 'clinical-trials')?.status).toBe('timeout')
    expect(sourceStatusForPanel(map, 'companies')?.status).toBe('error')
    expect(sourceStatusForPanel(map, 'missing')).toBeUndefined()
  })

  test('sourceStatusForPanel prefers direct panel id key', () => {
    const map = {
      'clinical-trials': { status: 'loaded' },
      clinicaltrials: { status: 'timeout' },
    }
    expect(sourceStatusForPanel(map, 'clinical-trials')?.status).toBe('loaded')
  })

  test('sourceStatusForPanel maps gnps-library / health-canada-dpd / cms-hospitals so hideEmpty cannot hide ERROR', () => {
    const map = {
      'gnps-library': { status: 'error', error: 'HTTP 503' },
      'health-canada-dpd': { status: 'error', error: 'HTTP 503' },
      'cms-hospitals': { status: 'error', error: 'HTTP 503' },
    }
    expect(sourceStatusForPanel(map, 'gnps')?.status).toBe('error')
    expect(sourceStatusForPanel(map, 'health-canada')?.status).toBe('error')
    expect(sourceStatusForPanel(map, 'us-hospitals')?.status).toBe('error')
  })

  test('resolveCategoryFetchedAt prefers _clientFetchedAt over now', () => {
    const d = resolveCategoryFetchedAt({
      _clientFetchedAt: '2020-01-15T12:00:00.000Z',
      _apiTrace: { finishedAt: '2021-06-01T00:00:00.000Z' },
    })
    expect(d.toISOString()).toBe('2020-01-15T12:00:00.000Z')
  })

  test('resolveCategoryFetchedAt falls back to api trace', () => {
    const d = resolveCategoryFetchedAt({
      _apiTrace: { finishedAt: '2021-06-01T00:00:00.000Z' },
    })
    expect(d.toISOString()).toBe('2021-06-01T00:00:00.000Z')
  })

  test('loadStatusFromPanelTrace picks worst status for panel', () => {
    const st = loadStatusFromPanelTrace(
      [
        { panelId: 'clinical-trials', loadStatus: 'empty' },
        { panelId: 'clinical-trials', loadStatus: 'timeout' },
      ],
      'clinical-trials',
    )
    expect(st).toBe('timeout')
  })

  test('loadStatusFromPanelTrace does not inherit other sources in the category', () => {
    const st = loadStatusFromPanelTrace(
      [
        { panelId: 'clinical-trials', source: 'clinicaltrials', loadStatus: 'loaded' },
        { panelId: 'chembl', source: 'chembl', loadStatus: 'timeout' },
      ],
      'adverse-events',
    )
    // Unrelated panel must not pick up chembl timeout
    expect(st).toBeUndefined()
  })
})
