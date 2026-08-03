/**
 * Free-API etiquette: host rate limit + 429 cooldown.
 */

import {
  acquireRateLimit,
  etiquetteBackoffMs,
  getRateLimitCooldownRemaining,
  noteRateLimited,
  parseRetryAfterMs,
  resetRateLimitBuckets,
  withRateLimit,
} from '@/lib/rateLimit'

describe('free-API etiquette rateLimit', () => {
  beforeEach(() => {
    resetRateLimitBuckets()
  })

  it('parseRetryAfterMs handles seconds', () => {
    expect(parseRetryAfterMs('3')).toBe(3000)
  })

  it('noteRateLimited sets cooldown', () => {
    noteRateLimited('https://pubchem.ncbi.nlm.nih.gov/rest/x', 1500)
    expect(getRateLimitCooldownRemaining('pubchem.ncbi.nlm.nih.gov')).toBeGreaterThan(500)
  })

  it('acquireRateLimit then release allows concurrency', async () => {
    const a = await acquireRateLimit('https://example.com/a')
    a.release()
    const b = await acquireRateLimit('https://example.com/b')
    b.release()
    expect(true).toBe(true)
  })

  it('withRateLimit runs fn', async () => {
    const v = await withRateLimit('https://example.com/x', async () => 7)
    expect(v).toBe(7)
  })

  it('etiquetteBackoffMs respects retryAfterMs', () => {
    const ms = etiquetteBackoffMs(1, { retryAfterMs: 2500 })
    expect(ms).toBeGreaterThanOrEqual(2500)
    expect(ms).toBeLessThan(3000)
  })

  it('etiquetteBackoffMs full jitter stays under max', () => {
    for (let i = 0; i < 20; i++) {
      const ms = etiquetteBackoffMs(5, { baseMs: 100, maxMs: 800 })
      expect(ms).toBeGreaterThanOrEqual(0)
      expect(ms).toBeLessThanOrEqual(800)
    }
  })
})
