/**
 * freeApiAgent — policy runtime (not LLM facts).
 * Ensures timeout / empty / error / retry are centralized.
 */

import { freeApiAgent } from '@/lib/api/freeApiAgent'

describe('freeApiAgent', () => {
  it('returns loaded when run yields data', async () => {
    const r = await freeApiAgent({
      source: 'test-loaded',
      empty: [] as number[],
      run: async () => [1, 2, 3],
    })
    expect(r.status).toBe('loaded')
    expect(r.data).toEqual([1, 2, 3])
    expect(r.attempts).toBe(1)
    expect(r.ms).toBeGreaterThanOrEqual(0)
  })

  it('returns empty when run yields empty payload', async () => {
    const r = await freeApiAgent({
      source: 'test-empty',
      empty: [] as string[],
      run: async () => [],
    })
    expect(r.status).toBe('empty')
    expect(r.data).toEqual([])
  })

  it('returns error status and empty on throw (no retry by default)', async () => {
    const r = await freeApiAgent({
      source: 'test-error',
      empty: null as string | null,
      run: async () => {
        throw new Error('upstream boom')
      },
    })
    expect(r.status).toBe('error')
    expect(r.data).toBeNull()
    expect(r.error).toMatch(/upstream boom/)
    expect(r.attempts).toBe(1)
  })

  it('retries on retryable HTTP status when retries > 0', async () => {
    let n = 0
    const r = await freeApiAgent({
      source: 'test-retry',
      empty: [] as number[],
      retries: 1,
      run: async () => {
        n += 1
        if (n === 1) {
          const err = new Error('HTTP 503') as Error & { status?: number }
          err.status = 503
          throw err
        }
        return [42]
      },
    })
    expect(n).toBe(2)
    expect(r.status).toBe('loaded')
    expect(r.data).toEqual([42])
    expect(r.attempts).toBe(2)
  })

  it('does not retry hard 4xx', async () => {
    let n = 0
    const r = await freeApiAgent({
      source: 'test-404',
      empty: [] as number[],
      retries: 2,
      run: async () => {
        n += 1
        const err = new Error('HTTP 404') as Error & { status?: number }
        err.status = 404
        throw err
      },
    })
    expect(n).toBe(1)
    expect(r.status).toBe('error')
  })

  it('uses fallback when primary empty on last attempt', async () => {
    const r = await freeApiAgent({
      source: 'test-fallback',
      empty: [] as string[],
      run: async () => [],
      fallback: async () => ['from-fallback'],
    })
    expect(r.status).toBe('loaded')
    expect(r.data).toEqual(['from-fallback'])
  })

  it('never throws — always resolves with envelope', async () => {
    await expect(
      freeApiAgent({
        source: 'test-never-throw',
        empty: {},
        run: async () => {
          throw new Error('hard fail')
        },
      }),
    ).resolves.toMatchObject({ status: 'error', source: 'test-never-throw' })
  })

  it('settles timeout even when run() ignores abort signal (hang forever)', async () => {
    const r = await freeApiAgent({
      source: 'test-hang',
      empty: [] as number[],
      timeoutMs: 80,
      run: async () =>
        new Promise<number[]>(() => {
          /* never resolves, never checks signal */
        }),
    })
    expect(r.status).toBe('timeout')
    expect(r.data).toEqual([])
    expect(r.ms).toBeLessThan(2000)
  })

  it('retries on 429 with etiquette backoff and marks rateLimited', async () => {
    let n = 0
    const r = await freeApiAgent({
      source: 'test-429',
      empty: [] as number[],
      retries: 1,
      skipSourceRateLimit: true,
      run: async () => {
        n += 1
        if (n === 1) {
          const err = new Error('HTTP 429') as Error & { status?: number; retryAfterMs?: number }
          err.status = 429
          err.retryAfterMs = 50
          throw err
        }
        return [1]
      },
    })
    expect(n).toBe(2)
    expect(r.status).toBe('loaded')
    expect(r.rateLimited).toBe(true)
  })
})
