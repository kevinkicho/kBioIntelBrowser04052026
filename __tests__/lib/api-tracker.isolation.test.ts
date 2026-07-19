import {
  flushApiMetrics,
  metricsToSourceStatus,
  runWithApiMetrics,
  trackedSafe,
} from '@/lib/api-tracker'

describe('api-tracker request isolation', () => {
  afterEach(() => {
    flushApiMetrics()
  })

  test('runWithApiMetrics isolates concurrent category fans-outs', async () => {
    const a = runWithApiMetrics(async () => {
      await trackedSafe(
        'clinicaltrials',
        new Promise((r) => setTimeout(() => r([{ nctId: 'NCT1' }]), 30)),
        [],
        200,
      )
      return 'A'
    })

    const b = runWithApiMetrics(async () => {
      await trackedSafe(
        'chembl',
        Promise.reject(new Error('API call timed out after 1ms')),
        [],
        1,
      )
      return 'B'
    })

    const [ra, rb] = await Promise.all([a, b])

    expect(ra.value).toBe('A')
    expect(rb.value).toBe('B')

    // A must only see clinicaltrials — not chembl timeout stolen from B
    const aKeys = ra.metrics.map((m) => m.source).sort()
    const bKeys = rb.metrics.map((m) => m.source).sort()
    expect(aKeys).toEqual(['clinicaltrials'])
    expect(bKeys).toEqual(['chembl'])
    expect(ra.metrics[0].loadStatus).toBe('loaded')
    expect(rb.metrics[0].loadStatus).toBe('timeout')

    const statusA = metricsToSourceStatus(ra.metrics)
    expect(statusA.chembl).toBeUndefined()
    expect(statusA.clinicaltrials?.status).toBe('loaded')
  })

  test('flush outside scope only clears global bag', () => {
    // No ALS store — uses process bag; must not throw
    expect(flushApiMetrics()).toEqual([])
  })
})
