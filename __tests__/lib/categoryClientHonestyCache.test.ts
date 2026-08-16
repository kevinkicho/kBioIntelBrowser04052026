/**
 * Client category revisit cache: empty-as-success must not pin as a success shell.
 */

const mockClientFetch = jest.fn()

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: (...args: unknown[]) => mockClientFetch(...args),
}))

jest.mock('@/lib/agentActivityLog', () => ({
  logAgentActivity: jest.fn(),
}))

import {
  categoryHasPanelPayload,
  categoryProfileCacheKey,
  fetchCategoryData,
  peekCategoryClientCache,
} from '@/lib/fetchCategory'
import {
  getProfileClientCache,
  invalidateProfileClientCache,
  setProfileClientCache,
} from '@/lib/profileClientCache'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

describe('category client honesty cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    invalidateProfileClientCache()
  })

  it('categoryHasPanelPayload ignores underscore keys and empty bags', () => {
    expect(categoryHasPanelPayload({ companies: [], _emptyHonest: true })).toBe(false)
    expect(
      categoryHasPanelPayload({ orangeBookEntries: [{ activeIngredient: 'aspirin' }] }),
    ).toBe(true)
  })

  it('does not serve leftover empty L1 as a cache hit', async () => {
    const key = categoryProfileCacheKey(2244, 'pharmaceutical')
    setProfileClientCache(
      key,
      { companies: [], _emptyHonest: true, _notRetrieved: true },
      60_000,
      { skipIdb: true },
    )
    expect(peekCategoryClientCache(2244, 'pharmaceutical')).toBeUndefined()

    mockClientFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orangeBookEntries: [{ activeIngredient: 'aspirin' }] }),
    })
    const data = await fetchCategoryData(2244, 'pharmaceutical')
    expect(mockClientFetch).toHaveBeenCalled()
    expect(data.orangeBookEntries).toEqual([{ activeIngredient: 'aspirin' }])
  })

  it('does not stamp empty-honest network payloads into L1', async () => {
    mockClientFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        companies: [],
        _emptyHonest: true,
        _notRetrieved: true,
      }),
    })
    const data = await fetchCategoryData(99, 'pharmaceutical')
    expect(data._emptyHonest).toBe(true)
    expect(shouldCacheHonestyEnvelope(data)).toBe(false)
    expect(getProfileClientCache(categoryProfileCacheKey(99, 'pharmaceutical'))).toBeUndefined()
  })

  it('does not stamp timeout shells into L1', async () => {
    mockClientFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        _partial: true,
        _timeout: true,
        _error: 'Category budget exceeded',
        category: 'pharmaceutical',
      }),
    })
    const data = await fetchCategoryData(7, 'pharmaceutical')
    expect(data._timeout).toBe(true)
    expect(shouldCacheHonestyEnvelope(data)).toBe(false)
    expect(getProfileClientCache(categoryProfileCacheKey(7, 'pharmaceutical'))).toBeUndefined()
  })

  it('stamps rows as a revisit success shell', async () => {
    mockClientFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orangeBookEntries: [{ activeIngredient: 'aspirin' }] }),
    })
    const data = await fetchCategoryData(8, 'pharmaceutical')
    expect(data.orangeBookEntries).toHaveLength(1)
    const cached = getProfileClientCache<Record<string, unknown>>(
      categoryProfileCacheKey(8, 'pharmaceutical'),
    )
    expect(cached?.orangeBookEntries).toEqual([{ activeIngredient: 'aspirin' }])
  })
})
