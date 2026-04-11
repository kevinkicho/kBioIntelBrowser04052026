import { getAlphaFoldPredictions } from '@/lib/api/alphafold'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getAlphaFoldPredictions', () => {
  test('returns parsed predictions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          entryId: 'AF-P12821-F1',
          uniprotAccession: 'P12821',
          gene: 'ACE',
          organismScientificName: 'Homo sapiens',
          paeOverallScore: 92.5,
          cifUrl: 'https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif',
        },
      ]),
    })
    const results = await getAlphaFoldPredictions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].entryId).toBe('AF-P12821-F1')
    expect(results[0].uniprotAccession).toBe('P12821')
    expect(results[0].geneName).toBe('ACE')
    expect(results[0].organismName).toBe('Homo sapiens')
    expect(results[0].confidenceScore).toBe(92.5)
    expect(results[0].modelUrl).toBe('https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif')
    expect(results[0].url).toBe('https://alphafold.ebi.ac.uk/entry/P12821')
  })

  test('falls back to globalMetricValue when paeOverallScore missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          entryId: 'AF-Q9Y5Y4-F1',
          uniprotAccession: 'Q9Y5Y4',
          gene: '',
          organismScientificName: 'Homo sapiens',
          globalMetricValue: 78.3,
          cifUrl: '',
        },
      ]),
    })
    const results = await getAlphaFoldPredictions(['Q9Y5Y4'])
    expect(results[0].confidenceScore).toBe(78.3)
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ([{ entryId: 'x', uniprotAccession: 'x', gene: '', organismScientificName: '', paeOverallScore: 0, cifUrl: '' }]),
    })
    await getAlphaFoldPredictions(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getAlphaFoldPredictions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('skips accessions that return non-ok response', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ entryId: 'AF-Q9Y5Y4-F1', uniprotAccession: 'Q9Y5Y4', gene: 'GENE2', organismScientificName: 'Homo sapiens', paeOverallScore: 85, cifUrl: '' }]),
      })
    const results = await getAlphaFoldPredictions(['P12821', 'Q9Y5Y4'])
    expect(results).toHaveLength(1)
    expect(results[0].uniprotAccession).toBe('Q9Y5Y4')
  })

  test('returns empty array on top-level network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getAlphaFoldPredictions(['P12821'])).toEqual([])
  })
})
