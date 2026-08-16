import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'

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

describe('getPathwayCommonsByName', () => {
  test('returns parsed pathway results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        searchHit: [
          {
            uri: 'https://reactome.org/content/detail/R-HSA-123',
            name: 'Aspirin Metabolism',
            dataSource: ['Reactome', 'KEGG'],
            numParticipants: 15,
          },
        ],
      }),
    )
    const results = await getPathwayCommonsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].pathwayId).toBe('https://reactome.org/content/detail/R-HSA-123')
    expect(results[0].pathwayName).toBe('Aspirin Metabolism')
    expect(results[0].source).toBe('Reactome, KEGG')
    expect(results[0].url).toBe('https://reactome.org/content/detail/R-HSA-123')
  })

  test('uses Number() coercion and falls back to defaults', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        searchHit: [
          {
            uri: 'some-local-id',
            name: 'Test',
            dataSource: 'SingleSource',
            numParticipants: null,
          },
        ],
      }),
    )
    const results = await getPathwayCommonsByName('test')
    expect(results[0].interactions).toBe(0)
    expect(results[0].source).toBe('SingleSource')
    expect(results[0].url).toBe('https://www.pathwaycommons.org/pc2/some-local-id')
  })

  test('encodes query parameter', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ searchHit: [] }))
    await getPathwayCommonsByName('ace inhibitor')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('ace%20inhibitor')
    expect(calledUrl).toContain('type=Pathway')
  })

  test('true empty JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ searchHit: [] }))
    expect(await getPathwayCommonsByName('unknownxyz')).toEqual([])
  })

  test('blank name is empty without fetch', async () => {
    expect(await getPathwayCommonsByName('  ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPathwayCommonsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPathwayCommonsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getPathwayCommonsByName('aspirin')).rejects.toThrow(/HTML/)
  })
})
