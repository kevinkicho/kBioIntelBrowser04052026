import { searchOLS, searchOntology, getOLSTermByIri } from '@/lib/api/ols'
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

describe('searchOLS', () => {
  test('returns parsed terms on success (embedded.terms)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        embedded: {
          terms: [
            {
              ontologyId: 'MONDO',
              label: 'type 2 diabetes mellitus',
              iri: 'http://purl.obolibrary.org/obo/MONDO_0005148',
              description: 'A type of diabetes',
              synonym: ['T2DM'],
            },
          ],
        },
        page: { totalElements: 1 },
      }),
    )
    const res = await searchOLS('diabetes')
    expect(res.terms).toHaveLength(1)
    expect(res.terms[0].label).toBe('type 2 diabetes mellitus')
    expect(res.terms[0].ontologyId).toBe('MONDO')
    expect(res.total).toBe(1)
  })

  test('maps OLS4 response.docs as success (not empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        response: {
          numFound: 1,
          docs: [
            {
              obo_id: 'MONDO:0005148',
              label: 'type 2 diabetes mellitus',
              iri: 'http://purl.obolibrary.org/obo/MONDO_0005148',
              ontology_prefix: 'MONDO',
              description: ['A type of diabetes'],
              synonym: ['T2DM'],
            },
          ],
        },
      }),
    )
    const res = await searchOLS('diabetes')
    expect(res.terms).toHaveLength(1)
    expect(res.terms[0].id).toBe('MONDO:0005148')
    expect(res.terms[0].ontologyId).toBe('MONDO')
    expect(res.total).toBe(1)
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: { numFound: 0, docs: [] } }))
    expect(await searchOLS('unknownxyz')).toEqual({ terms: [], total: 0 })
  })

  test('blank query is empty without fetch', async () => {
    expect(await searchOLS('  ')).toEqual({ terms: [], total: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchOLS('diabetes')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchOLS('diabetes')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchOLS('diabetes')).rejects.toThrow(/HTML/)
  })
})

describe('searchOntology / getOLSTermByIri honesty', () => {
  test('searchOntology throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 502))
    await expect(searchOntology('mondo', 'diabetes')).rejects.toThrow(/HTTP 502/)
  })

  test('getOLSTermByIri throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 500))
    await expect(getOLSTermByIri('http://purl.obolibrary.org/obo/MONDO_0005148')).rejects.toThrow(
      /HTTP 500/,
    )
  })

  test('getOLSTermByIri blank iri is null without fetch', async () => {
    expect(await getOLSTermByIri('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('OLS trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ols', searchOLS('diabetes'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const ols = metrics.find((m) => m.source === 'ols')
    expect(ols?.loadStatus).toBe('error')
    expect(ols?.error).toMatch(/HTTP 503/)
    expect(ols?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: { docs: [] } }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ols', searchOLS('unknownxyz'), { terms: [], total: 0 }),
    )
    expect(value).toEqual({ terms: [], total: 0 })
    const ols = metrics.find((m) => m.source === 'ols')
    expect(ols?.loadStatus).not.toBe('error')
    expect(ols?.loadStatus).not.toBe('timeout')
    expect(ols?.error).toBeUndefined()
  })
})
