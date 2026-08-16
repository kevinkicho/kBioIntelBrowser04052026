import { getReactomePathwaysByName } from '@/lib/api/reactome'

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

describe('getReactomePathwaysByName', () => {
  test('returns parsed pathways on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        results: [
          {
            typeName: 'Pathway',
            entries: [
              {
                stId: 'R-HSA-2162123',
                name: 'Synthesis of Prostaglandins (PG)',
                species: 'Homo sapiens',
                summation: 'Prostaglandins are synthesized from arachidonic acid.',
              },
              {
                stId: 'R-HSA-76002',
                name: 'Platelet activation',
                species: 'Homo sapiens',
                summation: 'Platelets are activated by several agonists.',
              },
            ],
          },
        ],
      }),
    })
    const results = await getReactomePathwaysByName('aspirin')
    expect(results).toHaveLength(2)
    expect(results[0].stId).toBe('R-HSA-2162123')
    expect(results[0].name).toBe('Synthesis of Prostaglandins (PG)')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://reactome.org/content/detail/R-HSA-2162123')
  })

  test('returns empty array when no Pathway type in results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        results: [
          { typeName: 'Protein', entries: [{ stId: 'R-HSA-1', name: 'Some protein' }] },
        ],
      }),
    })
    const results = await getReactomePathwaysByName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getReactomePathwaysByName('unknownxyz')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getReactomePathwaysByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getReactomePathwaysByName('aspirin')).rejects.toThrow(/network/)
  })
})
