import { getCitationMetrics } from '@/lib/api/opencitations'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

function jsonRes(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

/** Each DOI fans out to 4 OpenCitations endpoints (count, refs, meta, citations). */
function mockDoiFanout(opts: {
  count?: string | number | null
  title?: string
  author?: string
  venue?: string
  pub_date?: string
  refs?: Array<{ cited?: string }>
  cites?: Array<{ citing?: string }>
}) {
  const countRes = jsonRes([{ count: opts.count ?? '0' }])
  const refRes = jsonRes(opts.refs ?? [])
  const metaRes = jsonRes(
    opts.title
      ? [
          {
            id: `doi:10.1000/x openalex:W1 pmid:123`,
            title: opts.title,
            author: opts.author ?? 'Doe, Jane',
            pub_date: opts.pub_date ?? '2020-01-01',
            venue: opts.venue ?? 'Nature [issn:0028-0836]',
            type: 'journal article',
            volume: '1',
            page: '1-2',
          },
        ]
      : [],
  )
  const citeRes = jsonRes(opts.cites ?? [])
  ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => {
    const url = String(input)
    if (url.includes('citation-count')) return countRes
    if (url.includes('/references/')) return refRes
    if (url.includes('/metadata/')) return metaRes
    return citeRes
  })
}

describe('getCitationMetrics', () => {
  test('returns enriched metrics with title and counts', async () => {
    mockDoiFanout({
      count: '42',
      title: 'Example Paper',
      author: 'Doe, Jane [orcid:0000]',
      venue: 'Nature [issn:1]',
      refs: [{ cited: 'doi:10.1000/ref1' }],
      cites: [{ citing: 'doi:10.1000/cite1' }],
    })
    const results = await getCitationMetrics(['10.1000/test'])
    expect(results).toHaveLength(1)
    expect(results[0].doi).toBe('10.1000/test')
    expect(results[0].citationCount).toBe(42)
    expect(results[0].title).toBe('Example Paper')
    expect(results[0].authors).toContain('Doe, Jane')
    expect(results[0].venue).toContain('Nature')
    expect(results[0].year).toBe('2020')
    expect(results[0].referenceCount).toBe(1)
    expect(results[0].citedBy).toContain('10.1000/cite1')
    expect(results[0].url).toBe('https://doi.org/10.1000/test')
    expect(results[0].openAlexId).toBe('W1')
    expect(results[0].pmid).toBe('123')
  })

  test('limits to 12 unique DOIs', async () => {
    const dois = Array.from({ length: 20 }, (_, i) => `10.1000/test${i}`)
    mockDoiFanout({ count: '1', title: 'T' })
    const results = await getCitationMetrics(dois)
    expect(results).toHaveLength(12)
    // 12 DOIs x 4 requests
    expect(fetch).toHaveBeenCalledTimes(48)
  }, 15000)

  test('returns empty array for empty DOI list', async () => {
    expect(await getCitationMetrics([])).toEqual([])
  })

  test('normalizes doi.org prefixes', async () => {
    mockDoiFanout({ count: '3', title: 'Normed' })
    const results = await getCitationMetrics(['https://doi.org/10.1000/norm'])
    expect(results[0].doi).toBe('10.1000/norm')
  })

  test('uses Number() coercion and falls back to 0', async () => {
    mockDoiFanout({ count: null, title: 'Zero' })
    const results = await getCitationMetrics(['10.1000/test'])
    expect(results[0].citationCount).toBe(0)
  })

  test('throws when all fetches reject', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getCitationMetrics(['10.1000/test'])).rejects.toThrow(/network/)
  })
})