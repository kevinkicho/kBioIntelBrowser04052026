import { searchGOTerms, getGOTerm, getGOAnnotationsForGene } from '@/lib/api/gene-ontology'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('searchGOTerms', () => {
  test('returns parsed terms on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            id: 'GO:0008150',
            name: 'biological_process',
            definition: { text: 'A biological process' },
            aspect: 'P',
            synonyms: ['BP'],
          },
        ],
        numberOfHits: 1,
      }),
    )
    const res = await searchGOTerms('apoptosis')
    expect(res.terms).toHaveLength(1)
    expect(res.terms[0].id).toBe('GO:0008150')
    expect(res.terms[0].label).toBe('biological_process')
    expect(res.terms[0].aspect).toBe('biological_process')
    expect(res.total).toBe(1)
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [], numberOfHits: 0 }))
    expect(await searchGOTerms('unknownxyz')).toEqual({ terms: [], total: 0 })
  })

  test('blank query is empty without fetch', async () => {
    expect(await searchGOTerms('  ')).toEqual({ terms: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGOTerms('apoptosis')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchGOTerms('apoptosis')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchGOTerms('apoptosis')).rejects.toThrow(/HTML/)
  })
})

describe('getGOTerm / getGOAnnotationsForGene honesty', () => {
  test('getGOTerm throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 500))
    await expect(getGOTerm('GO:0008150')).rejects.toThrow(/HTTP 500/)
  })

  test('getGOTerm blank id is null without fetch', async () => {
    expect(await getGOTerm('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('getGOAnnotationsForGene throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getGOAnnotationsForGene('BRCA1')).rejects.toThrow(/HTTP 502/)
  })
})

describe('GO trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gene-ontology', searchGOTerms('apoptosis'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const go = metrics.find((m) => m.source === 'gene-ontology')
    expect(go?.loadStatus).toBe('error')
    expect(go?.error).toMatch(/HTTP 503/)
    expect(go?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gene-ontology', searchGOTerms('unknownxyz'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const go = metrics.find((m) => m.source === 'gene-ontology')
    expect(go?.loadStatus).not.toBe('error')
    expect(go?.loadStatus).not.toBe('timeout')
    expect(go?.error).toBeUndefined()
  })
})