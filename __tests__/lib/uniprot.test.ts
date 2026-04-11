import { getUniprotEntriesByName } from '@/lib/api/uniprot'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getUniprotEntriesByName', () => {
  test('returns parsed entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            primaryAccession: 'P00734',
            proteinDescription: {
              recommendedName: {
                fullName: { value: 'Prothrombin' },
              },
            },
            genes: [{ geneName: { value: 'F2' } }],
            organism: { scientificName: 'Homo sapiens' },
            comments: [
              {
                commentType: 'FUNCTION',
                texts: [{ value: 'Thrombin cleaves fibrinogen to form fibrin.' }],
              },
            ],
          },
        ],
      }),
    })
    const results = await getUniprotEntriesByName('thrombin')
    expect(results).toHaveLength(1)
    expect(results[0].accession).toBe('P00734')
    expect(results[0].proteinName).toBe('Prothrombin')
    expect(results[0].geneName).toBe('F2')
    expect(results[0].organism).toBe('Homo sapiens')
    expect(results[0].functionSummary).toBe('Thrombin cleaves fibrinogen to form fibrin.')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getUniprotEntriesByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getUniprotEntriesByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getUniprotEntriesByName('aspirin')
    expect(results).toEqual([])
  })

  test('handles missing optional fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            primaryAccession: 'Q12345',
            proteinDescription: {},
            genes: [],
            organism: { scientificName: 'Unknown' },
            comments: [],
          },
        ],
      }),
    })
    const results = await getUniprotEntriesByName('something')
    expect(results).toHaveLength(1)
    expect(results[0].proteinName).toBe('Unknown protein')
    expect(results[0].geneName).toBe('')
    expect(results[0].functionSummary).toBe('')
  })
})
