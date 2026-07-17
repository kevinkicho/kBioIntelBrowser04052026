import {
  clearSearchHistory,
  hrefWithRefresh,
  kindLabel,
  recordSearch,
  readSearchHistory,
  removeSearchHistory,
  sortAndFilterHistory,
  discoverRankCacheKey,
  setCachedDiscoverRank,
  getCachedDiscoverRank,
  clearCachedDiscoverRank,
  SEARCH_HISTORY_KEY,
} from '@/lib/searchHistory'

describe('searchHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('records and upserts by href', () => {
    recordSearch({ kind: 'molecule', query: 'aspirin', title: 'Aspirin', href: '/molecule/2244' })
    recordSearch({ kind: 'molecule', query: 'aspirin', title: 'Aspirin', href: '/molecule/2244' })
    const all = readSearchHistory()
    expect(all).toHaveLength(1)
    expect(all[0].visitCount).toBe(2)
    expect(all[0].meta?.cid).toBeUndefined()
  })

  it('sorts and filters', () => {
    recordSearch({ kind: 'disease', query: 'diabetes', href: '/disease?q=diabetes' })
    recordSearch({ kind: 'gene', query: 'EGFR', href: '/gene?q=EGFR' })
    recordSearch({ kind: 'molecule', query: 'metformin', href: '/molecule/4091', meta: { cid: 4091 } })
    const diseases = sortAndFilterHistory(readSearchHistory(), { filter: 'disease' })
    expect(diseases).toHaveLength(1)
    expect(diseases[0].kind).toBe('disease')
    const byTitle = sortAndFilterHistory(readSearchHistory(), { sort: 'title' })
    expect(byTitle[0].title.toLowerCase() <= byTitle[1].title.toLowerCase()).toBe(true)
  })

  it('removes and clears', () => {
    const e = recordSearch({ kind: 'gene', query: 'TP53', href: '/gene?q=TP53' })
    expect(e).toBeTruthy()
    removeSearchHistory(e!.id)
    expect(readSearchHistory()).toHaveLength(0)
    recordSearch({ kind: 'gene', query: 'BRCA1', href: '/gene?q=BRCA1' })
    clearSearchHistory()
    expect(localStorage.getItem(SEARCH_HISTORY_KEY)).toBe('[]')
  })

  it('hrefWithRefresh adds bust params', () => {
    const h = hrefWithRefresh('/molecule/2244')
    expect(h).toMatch(/refresh=1/)
    expect(h).toMatch(/_t=/)
  })

  it('kindLabel covers kinds', () => {
    expect(kindLabel('discover')).toBe('Discover')
    expect(kindLabel('molecule')).toBe('Molecule')
  })

  it('caches discover rank by key', () => {
    const key = discoverRankCacheKey({ q: 'ATTR', diseaseId: 'EFO_1', targets: ['TTR'] })
    setCachedDiscoverRank(key, { candidates: [{ name: 'X' }] })
    expect(getCachedDiscoverRank(key)).toEqual({ candidates: [{ name: 'X' }] })
    clearCachedDiscoverRank(key)
    expect(getCachedDiscoverRank(key)).toBeNull()
  })
})
