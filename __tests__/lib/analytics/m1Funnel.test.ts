import {
  claimCountFromProps,
  citableFromProps,
  computeM1FunnelFromEvents,
  funnelSnapshotToCsv,
  funnelSnapshotToJson,
} from '@/lib/analytics/m1Funnel'

describe('prop dual-read', () => {
  it('reads historical count/citable and design claimCount/citableCount', () => {
    expect(claimCountFromProps({ count: 12 })).toBe(12)
    expect(claimCountFromProps({ claimCount: 9 })).toBe(9)
    expect(claimCountFromProps({ claimCount: 9, count: 1 })).toBe(9)
    expect(citableFromProps({ citable: 5 })).toBe(5)
    expect(citableFromProps({ citableCount: 7 })).toBe(7)
    expect(citableFromProps({})).toBeNull()
  })
})

describe('computeM1FunnelFromEvents', () => {
  const base = '2026-07-01T12:00:00.000Z'
  const t = (min: number) =>
    new Date(Date.parse(base) + min * 60_000).toISOString()

  it('counts events and includes pack_exported in packOrRh', () => {
    const snap = computeM1FunnelFromEvents(
      [
        { name: 'discover_started', ts: t(0) },
        { name: 'discover_rank_completed', ts: t(1), props: { ms: 8000, count: 10 } },
        { name: 'board_candidate_added', ts: t(2) },
        { name: 'pack_exported', ts: t(3), props: { count: 20, citable: 8 } },
      ],
      { windowDays: 30, nowMs: Date.parse('2026-07-02T00:00:00.000Z') },
    )
    expect(snap.startedCount).toBe(1)
    expect(snap.rankedCount).toBe(1)
    expect(snap.boardedCount).toBe(1)
    expect(snap.packOrRhCount).toBe(1)
    expect(snap.completedLoops).toBe(1)
    expect(snap.medianCitable).toBe(8)
    expect(snap.m7.p50).toBe(8000)
    expect(snap.m7.samples).toBe(1)
  })

  it('does not complete loop when pack precedes board', () => {
    const snap = computeM1FunnelFromEvents(
      [
        { name: 'discover_rank_completed', ts: t(0), props: { ms: 1000 } },
        { name: 'pack_opened', ts: t(1) },
        { name: 'board_candidate_added', ts: t(2) },
      ],
      { windowDays: 0 },
    )
    expect(snap.completedLoops).toBe(0)
  })

  it('does not complete board without prior rank', () => {
    const snap = computeM1FunnelFromEvents(
      [
        { name: 'board_candidate_added', ts: t(0) },
        { name: 'pack_exported', ts: t(1), props: { citable: 3 } },
      ],
      { windowDays: 0 },
    )
    expect(snap.completedLoops).toBe(0)
  })

  it('excludes harvest_safety_done from M7 samples', () => {
    const snap = computeM1FunnelFromEvents(
      [
        { name: 'discover_rank_completed', ts: t(0), props: { ms: 5000 } },
        { name: 'harvest_safety_done', ts: t(1), props: { ms: 90000 } },
      ],
      { windowDays: 0 },
    )
    expect(snap.m7.samples).toBe(1)
    expect(snap.m7.p50).toBe(5000)
  })

  it('dual-reads design keys on pack_exported', () => {
    const snap = computeM1FunnelFromEvents(
      [
        {
          name: 'pack_exported',
          ts: t(0),
          props: { claimCount: 15, citableCount: 6 },
        },
      ],
      { windowDays: 0 },
    )
    expect(snap.medianCitable).toBe(6)
    expect(snap.meanClaimCount).toBe(15)
  })

  it('exports json and csv', () => {
    const snap = computeM1FunnelFromEvents([], { windowDays: 0 })
    expect(JSON.parse(funnelSnapshotToJson(snap)).schema).toBe('biointel-m1-funnel-v1')
    expect(funnelSnapshotToCsv(snap)).toMatch(/^started,/)
  })
})
