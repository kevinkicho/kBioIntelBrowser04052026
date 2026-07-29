/**
 * Isolation hardenings: mapSettled / allSettledValues, abort ALS, source health summary.
 */

import {
  allSettledValues,
  mapSettled,
  metricsToSourceStatus,
  runWithApiMetrics,
  trackedSafe,
} from '@/lib/api-tracker'
import {
  ensureApiFetchAbortPatch,
  getApiAbortSignal,
  resetApiFetchAbortPatchForTests,
  runWithApiAbort,
} from '@/lib/api/apiAbort'
import { summarizeSourceHealth } from '@/lib/panelApiTrace'

describe('mapSettled / allSettledValues', () => {
  it('continues siblings when one item rejects', async () => {
    const results = await mapSettled(
      [1, 2, 3],
      async (n) => {
        if (n === 2) throw new Error('boom')
        return n * 10
      },
      -1,
    )
    expect(results).toEqual([10, -1, 30])
  })

  it('allSettledValues isolates rejections', async () => {
    const results = await allSettledValues(
      [Promise.resolve('a'), Promise.reject(new Error('x')), Promise.resolve('c')],
      'fallback',
    )
    expect(results).toEqual(['a', 'fallback', 'c'])
  })

  it('trackedSafe openfda-style fanout does not fail whole source on one synonym', async () => {
    const { value, metrics } = await runWithApiMetrics(async () => {
      const nested = await trackedSafe(
        'openfda',
        mapSettled(
          ['ok', 'bad', 'also-ok'],
          async (term) => {
            if (term === 'bad') throw new Error('upstream 500')
            return [{ brandName: term }]
          },
          [] as { brandName: string }[],
        ).then((r) => r.flat()),
        [] as { brandName: string }[],
      )
      return nested
    })
    expect(value).toEqual([{ brandName: 'ok' }, { brandName: 'also-ok' }])
    expect(metrics).toHaveLength(1)
    expect(metrics[0]!.source).toBe('openfda')
    expect(metrics[0]!.loadStatus).toBe('loaded')
  })

  it('trackedSafe siblings continue when one source errors', async () => {
    const { value, metrics } = await runWithApiMetrics(async () => {
      const [a, b, c] = await Promise.all([
        trackedSafe('src-a', Promise.reject(new Error('fail-a')), [] as string[]),
        trackedSafe('src-b', Promise.resolve(['b1']), [] as string[]),
        trackedSafe('src-c', Promise.resolve(['c1']), [] as string[]),
      ])
      return { a, b, c }
    })
    expect(value).toEqual({ a: [], b: ['b1'], c: ['c1'] })
    const status = metricsToSourceStatus(metrics)
    expect(status['src-a']?.status).toBe('error')
    expect(status['src-b']?.status).toBe('loaded')
    expect(status['src-c']?.status).toBe('loaded')
  })
})

describe('runWithApiAbort + fetch patch', () => {
  afterEach(() => {
    resetApiFetchAbortPatchForTests()
  })

  it('exposes ALS signal inside runWithApiAbort', async () => {
    const ac = new AbortController()
    let seen: AbortSignal | undefined
    await runWithApiAbort(ac, async () => {
      seen = getApiAbortSignal()
    })
    expect(seen).toBe(ac.signal)
  })

  it('aborts in-flight fetch when controller aborts', async () => {
    resetApiFetchAbortPatchForTests()
    const ac = new AbortController()
    let capturedSignal: AbortSignal | undefined
    // Install mock *before* patch so the patch wraps the mock as originalFetch
    globalThis.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
        if (init?.signal?.aborted) {
          onAbort()
          return
        }
        init?.signal?.addEventListener('abort', onAbort, { once: true })
      })
    }) as typeof fetch
    ensureApiFetchAbortPatch()

    const p = runWithApiAbort(ac, async () => fetch('https://example.test/slow'))
    await new Promise((r) => setTimeout(r, 20))
    ac.abort()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
    expect(capturedSignal?.aborted).toBe(true)
  })

  it('does not inject signal when no ALS store is active', async () => {
    resetApiFetchAbortPatchForTests()
    let sawSignal: AbortSignal | undefined
    let called = false
    globalThis.fetch = jest.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      called = true
      sawSignal = init?.signal ?? undefined
      return Promise.resolve(new Response('{}', { status: 200 }))
    }) as typeof fetch
    ensureApiFetchAbortPatch()

    await fetch('https://example.test/no-als')
    expect(called).toBe(true)
    expect(sawSignal).toBeUndefined()
  })
})

describe('summarizeSourceHealth', () => {
  it('counts OK as loaded + empty and reports failures', () => {
    const s = summarizeSourceHealth([
      { loadStatus: 'loaded', has_data: true },
      { loadStatus: 'empty', has_data: false },
      { loadStatus: 'error' },
      { loadStatus: 'timeout' },
      { loadStatus: 'disabled' },
    ])
    expect(s.total).toBe(5)
    expect(s.ok).toBe(2)
    expect(s.withData).toBe(1)
    expect(s.empty).toBe(1)
    expect(s.errors).toBe(1)
    expect(s.timeouts).toBe(1)
    expect(s.disabled).toBe(1)
  })
})
