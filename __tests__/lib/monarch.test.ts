import { getMonarchDiseasesByName } from '@/lib/api/monarch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getMonarchDiseasesByName', () => {
  test('returns parsed diseases on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      items: [
        {
          id: 'MONDO:0011993',
          name: 'type 2 diabetes mellitus',
          description: 'A form of diabetes that is characterized by insulin resistance.',
          category: 'biolink:Disease',
          has_phenotype_count: 42,
        },
      ],
    }))
    const results = await getMonarchDiseasesByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('MONDO:0011993')
    expect(results[0].name).toBe('type 2 diabetes mellitus')
    expect(results[0].description).toBe('A form of diabetes that is characterized by insulin resistance.')
    expect(results[0].phenotypeCount).toBe(42)
    expect(results[0].url).toBe('https://monarchinitiative.org/MONDO:0011993')
  })

  test('throws on HTTP error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMonarchDiseasesByName('unknown')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getMonarchDiseasesByName('metformin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getMonarchDiseasesByName('metformin')).rejects.toThrow(/network/)
  })

  test('handles missing fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      items: [{ id: 'MONDO:0000001' }],
    }))
    const results = await getMonarchDiseasesByName('test')
    expect(results[0].name).toBe('')
    expect(results[0].description).toBe('')
    expect(results[0].phenotypeCount).toBe(0)
  })
})
