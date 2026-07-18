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
})
