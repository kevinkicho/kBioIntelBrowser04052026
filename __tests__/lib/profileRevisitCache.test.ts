/**
 * @jest-environment jsdom
 */
import {
  profileCacheKey,
  getProfileClientCache,
  setProfileClientCache,
  deleteProfileClientCache,
  invalidateProfileClientCache,
  profileClientCacheSize,
  clearAllProfileRevisitCache,
  getProfileClientCacheAsync,
} from '@/lib/profileClientCache'
import {
  parseProfileCacheKey,
  selectCidsToEvict,
  PROFILE_REVISIT_CID_LRU_MAX,
  PROFILE_REVISIT_MAX_RECORD_BYTES,
  idbPutAggregate,
} from '@/lib/profileRevisitIdb'
import {
  peekCategoryClientCache,
  fetchCategoryData,
  categoryProfileCacheKey,
} from '@/lib/fetchCategory'

beforeEach(async () => {
  // Memory clear only when IDB unavailable (jsdom often has no IDB)
  invalidateProfileClientCache()
})

describe('profileCacheKey / parseProfileCacheKey', () => {
  test('round-trips category and pipeline keys', () => {
    const cat = profileCacheKey('category', 3080836, 'pharmaceutical||')
    expect(cat).toBe('category:3080836:pharmaceutical||')
    expect(parseProfileCacheKey(cat)).toEqual({
      kind: 'category',
      cid: 3080836,
      categoryId: 'pharmaceutical',
    })
    const pipe = profileCacheKey('pipeline', 2244)
    expect(parseProfileCacheKey(pipe)).toEqual({
      kind: 'pipeline',
      cid: 2244,
      categoryId: undefined,
    })
  })

  test('rejects malformed keys', () => {
    expect(parseProfileCacheKey('nope')).toEqual({ kind: null, cid: 0 })
    expect(parseProfileCacheKey('category:x:y')).toEqual({ kind: null, cid: 0 })
  })
})

describe('selectCidsToEvict', () => {
  test('returns empty when under cap', () => {
    const rows = [
      { cid: 1, accessedAt: '2026-01-01T00:00:00.000Z' },
      { cid: 2, accessedAt: '2026-01-02T00:00:00.000Z' },
    ]
    expect(selectCidsToEvict(rows, 8)).toEqual([])
  })

  test('drops oldest CIDs beyond max', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      cid: i + 1,
      accessedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    }))
    const drop = selectCidsToEvict(rows, PROFILE_REVISIT_CID_LRU_MAX)
    expect(drop.length).toBe(2)
    expect(drop).toContain(1)
    expect(drop).toContain(2)
  })

  test('uses latest accessedAt per cid', () => {
    const rows = [
      { cid: 1, accessedAt: '2026-01-01T00:00:00.000Z' },
      { cid: 1, accessedAt: '2026-01-10T00:00:00.000Z' }, // newest for cid 1
      { cid: 2, accessedAt: '2026-01-02T00:00:00.000Z' },
      { cid: 3, accessedAt: '2026-01-03T00:00:00.000Z' },
    ]
    // max 2 → drop oldest max-access (cid 2 is older than 1 and 3)
    const drop = selectCidsToEvict(rows, 2)
    expect(drop).toEqual([2])
  })
})

describe('memory L1 profileClientCache', () => {
  test('set/get and delete', () => {
    const key = profileCacheKey('pipeline', 1)
    setProfileClientCache(key, { clinicalTrials: [] }, 60_000, { skipIdb: true })
    expect(getProfileClientCache(key)).toEqual({ clinicalTrials: [] })
    deleteProfileClientCache(key)
    expect(getProfileClientCache(key)).toBeUndefined()
  })

  test('invalidate by cid', () => {
    setProfileClientCache(profileCacheKey('category', 9, 'pharmaceutical||'), { a: 1 }, 60_000, {
      skipIdb: true,
    })
    setProfileClientCache(profileCacheKey('pipeline', 9), { b: 2 }, 60_000, { skipIdb: true })
    setProfileClientCache(profileCacheKey('pipeline', 10), { c: 3 }, 60_000, { skipIdb: true })
    invalidateProfileClientCache(9)
    expect(getProfileClientCache(profileCacheKey('pipeline', 9))).toBeUndefined()
    expect(getProfileClientCache(profileCacheKey('pipeline', 10))).toEqual({ c: 3 })
  })

  test('peekCategoryClientCache reads L1', () => {
    const key = categoryProfileCacheKey(5, 'clinical-safety')
    setProfileClientCache(key, { trials: [] }, 60_000, { skipIdb: true })
    expect(peekCategoryClientCache(5, 'clinical-safety')).toEqual({ trials: [] })
    expect(peekCategoryClientCache(5, 'pharmaceutical')).toBeUndefined()
  })

  test('getProfileClientCacheAsync hits memory without IDB', async () => {
    const key = profileCacheKey('pipeline', 11)
    setProfileClientCache(key, { cached: true }, 60_000, { skipIdb: true })
    await expect(getProfileClientCacheAsync(key)).resolves.toEqual({ cached: true })
  })

  test('expired entry misses', () => {
    const key = profileCacheKey('pipeline', 12)
    setProfileClientCache(key, { old: true }, 1, { skipIdb: true })
    // Force expiry
    const e = (getProfileClientCache as unknown as { toString: () => string })
    void e
    // Wait past 1ms TTL via direct clock: re-set with past by manipulating store through short TTL
    const start = Date.now()
    while (Date.now() - start < 5) {
      /* spin */
    }
    expect(getProfileClientCache(key)).toBeUndefined()
  })
})

describe('idbPutAggregate guards', () => {
  test('oversized payload rejected without needing IDB', async () => {
    const key = profileCacheKey('pipeline', 7)
    const huge = 'x'.repeat(PROFILE_REVISIT_MAX_RECORD_BYTES + 100)
    const ok = await idbPutAggregate(key, { huge })
    expect(ok).toBe(false)
  })

  test('invalid key rejected', async () => {
    expect(await idbPutAggregate('bad', { a: 1 })).toBe(false)
  })
})

describe('fetchCategoryData cache short-circuit', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('returns L1 without network', async () => {
    const key = categoryProfileCacheKey(99, 'molecular-chemical')
    setProfileClientCache(key, { from: 'cache' }, 60_000, { skipIdb: true })
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    const data = await fetchCategoryData(99, 'molecular-chemical')
    expect(data).toEqual({ from: 'cache' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('profileClientCacheSize', () => {
  test('counts entries', async () => {
    await clearAllProfileRevisitCache()
    expect(profileClientCacheSize()).toBe(0)
    setProfileClientCache(profileCacheKey('pipeline', 1), {}, 60_000, { skipIdb: true })
    expect(profileClientCacheSize()).toBe(1)
  })
})
