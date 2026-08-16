import { getGenesByDisease, getDiseasesByGene } from '@/lib/api/disgenet'

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

describe('getGenesByDisease', () => {
  test('returns parsed associations on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        response: [
          {
            gene_symbol: 'TTR',
            gene_id: '7276',
            disease_id: 'C0002395',
            disease_name: 'Alzheimer Disease',
            disease_type: 'disease',
            score: 0.4,
            source: 'CURATED',
            pmids: ['1', '2'],
          },
        ],
      }),
    )
    const results = await getGenesByDisease('alzheimer')
    expect(results).toHaveLength(1)
    expect(results[0].geneSymbol).toBe('TTR')
    expect(results[0].score).toBe(0.4)
  })

  test('true empty JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: [] }))
    expect(await getGenesByDisease('obscurexyz')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGenesByDisease('alzheimer')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGenesByDisease('alzheimer')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getGenesByDisease('alzheimer')).rejects.toThrow(/HTML/)
  })

  test('blank query is empty without fetch', async () => {
    expect(await getGenesByDisease('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('getDiseasesByGene', () => {
  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDiseasesByGene('TTR')).rejects.toThrow(/HTTP 503/)
  })
})