import {
  extractUniProtProteinName,
  getUniprotEntriesByName,
  getUniProtProtein,
} from '@/lib/api/uniprot'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('extractUniProtProteinName', () => {
  test('reads recommendedName.fullName.value', () => {
    expect(
      extractUniProtProteinName({
        recommendedName: { fullName: { value: 'Prothrombin' } },
        alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
      }),
    ).toBe('Prothrombin')
  })

  test('falls back to alternativeNames when recommended missing', () => {
    expect(
      extractUniProtProteinName({
        alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
      }),
    ).toBe('Coagulation factor II')
  })

  test('never returns a nested object (React-safe string)', () => {
    const name = extractUniProtProteinName({
      recommendedName: { fullName: { value: 'Aspirin target' } },
      alternativeNames: [],
    })
    expect(typeof name).toBe('string')
    expect(name).not.toEqual(expect.objectContaining({ recommendedName: expect.anything() }))
  })
})

describe('getUniProtProtein', () => {
  test('maps proteinDescription object to a string proteinName', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        primaryAccession: 'P00734',
        uniProtkbId: 'THRB_HUMAN',
        proteinDescription: {
          recommendedName: { fullName: { value: 'Prothrombin' } },
          alternativeNames: [{ fullName: { value: 'Coagulation factor II' } }],
        },
        genes: [{ geneName: { value: 'F2' } }],
        organism: { scientificName: 'Homo sapiens' },
        sequence: { length: 622, sequence: 'MAH…' },
        comments: [
          {
            commentType: 'FUNCTION',
            texts: [{ value: 'Thrombin cleaves fibrinogen.' }],
          },
          {
            commentType: 'SUBCELLULAR LOCATION',
            subcellularLocations: [{ location: { value: 'Secreted' } }],
          },
        ],
        features: [
          {
            type: 'VARIANT',
            location: { start: { value: 10 }, end: { value: 10 } },
            alternativeSequence: {
              originalSequence: 'A',
              alternativeSequences: ['V'],
            },
            description: 'In dbSNP:rs1',
          },
        ],
      }),
    })
    const p = await getUniProtProtein('P00734')
    expect(p).not.toBeNull()
    expect(typeof p!.proteinName).toBe('string')
    expect(p!.proteinName).toBe('Prothrombin')
    expect(p!.geneName).toBe('F2')
    expect(p!.subcellularLocation).toBe('Secreted')
    expect(p!.variants?.[0]?.sequence).toBe('A→V')
  })
})

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
