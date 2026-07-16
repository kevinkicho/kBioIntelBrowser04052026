import {
  detectChanges,
  diffCounts,
  extractTrackedCounts,
  saveSnapshot,
  TRACKED_KEYS,
} from '@/lib/changeDetection'
import {
  detectMoleculeSignals,
  detectSignalsFromCounts,
  toSignalItems,
} from '@/lib/signals'

describe('changeDetection reuse', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('TRACKED_KEYS include panelId for deep links', () => {
    for (const t of TRACKED_KEYS) {
      expect(t.panelId).toBeTruthy()
      expect(t.key).toBeTruthy()
    }
    expect(TRACKED_KEYS.find((t) => t.key === 'adverseEvents')?.panelId).toBe(
      'adverse-events',
    )
    expect(TRACKED_KEYS.find((t) => t.key === 'clinicalTrials')?.panelId).toBe(
      'clinical-trials',
    )
  })

  it('extractTrackedCounts counts arrays only', () => {
    const counts = extractTrackedCounts({
      clinicalTrials: [{}, {}, {}],
      adverseEvents: [],
      patents: 'not-array',
    })
    expect(counts.clinicalTrials).toBe(3)
    expect(counts.adverseEvents).toBe(0)
    expect(counts.patents).toBe(0)
  })

  it('diffCounts returns new/removed with panelId', () => {
    const prev = { clinicalTrials: 2, adverseEvents: 10 }
    const curr = { clinicalTrials: 5, adverseEvents: 7 }
    const changes = diffCounts(prev, curr)
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'clinicalTrials',
          panelId: 'clinical-trials',
          type: 'new',
          count: 3,
        }),
        expect.objectContaining({
          key: 'adverseEvents',
          panelId: 'adverse-events',
          type: 'removed',
          count: 3,
        }),
      ]),
    )
  })

  it('diffCounts returns empty without previous', () => {
    expect(diffCounts(null, { clinicalTrials: 5 })).toEqual([])
  })

  it('detectChanges uses localStorage snapshot', () => {
    saveSnapshot(2244, {
      clinicalTrials: [{}, {}],
      adverseEvents: [{}, {}, {}],
    })
    const changes = detectChanges(2244, {
      clinicalTrials: [{}, {}, {}, {}],
      adverseEvents: [{}, {}, {}],
    })
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      key: 'clinicalTrials',
      panelId: 'clinical-trials',
      type: 'new',
      count: 2,
    })
  })
})

describe('detectMoleculeSignals', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('attaches deep-link hrefs with project context', () => {
    saveSnapshot(2244, { clinicalTrials: [{}] })
    const signals = detectMoleculeSignals(
      2244,
      { clinicalTrials: [{}, {}, {}] },
      { projectId: 'prj_1', disease: 'X' },
    )
    expect(signals).toHaveLength(1)
    expect(signals[0].href).toBe(
      '/molecule/2244?project=prj_1&disease=X#clinical-trials',
    )
    expect(signals[0].panelId).toBe('clinical-trials')
  })

  it('toSignalItems maps all changes', () => {
    const items = toSignalItems(
      [
        {
          key: 'patents',
          panelId: 'patents',
          category: 'Research',
          label: 'patents',
          type: 'new',
          count: 1,
        },
      ],
      99,
    )
    expect(items[0].href).toBe('/molecule/99#patents')
  })

  it('detectSignalsFromCounts is pure (no localStorage required)', () => {
    const signals = detectSignalsFromCounts(
      1,
      { companies: 1 },
      { companies: 3 },
    )
    expect(signals[0]).toMatchObject({
      key: 'companies',
      panelId: 'companies',
      type: 'new',
      count: 2,
      href: '/molecule/1#companies',
    })
  })
})
