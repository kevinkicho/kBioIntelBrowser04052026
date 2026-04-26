import { getPdbStructuresByName } from '@/lib/api/pdb'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPdbStructuresByName', () => {
  test('returns parsed PDB structures on success', async () => {
    // First call: search API returns PDB IDs
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        result_set: [
          { identifier: '1M17', score: 1.0 },
          { identifier: '4HJO', score: 0.9 },
        ],
      })
    )
    // Subsequent calls: per-entry detail fetches (in order of pdbIds: 1M17 then 4HJO)
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        struct: { title: 'Crystal structure of EGFR with erlotinib' },
        rcsb_entry_info: {
          resolution_combined: [2.6],
          experimental_method: 'X-RAY DIFFRACTION',
        },
        rcsb_accession_info: { deposit_date: '2023-05-10' },
      })
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        struct: { title: 'EGFR kinase domain complex' },
        rcsb_entry_info: {
          resolution_combined: [1.8],
          experimental_method: 'X-RAY DIFFRACTION',
        },
        rcsb_accession_info: { deposit_date: '2022-11-01' },
      })
    )
    const results = await getPdbStructuresByName('erlotinib')
    expect(results).toHaveLength(2)
    // Should be sorted by resolution (best first)
    expect(results[0].pdbId).toBe('4HJO')
    expect(results[0].resolution).toBe(1.8)
    expect(results[1].pdbId).toBe('1M17')
    expect(results[1].title).toBe('Crystal structure of EGFR with erlotinib')
    expect(results[1].url).toBe('https://www.rcsb.org/structure/1M17')
  })

  test('returns empty array when search returns no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({ result_set: [] })
    )
    const results = await getPdbStructuresByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when search API is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    const results = await getPdbStructuresByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getPdbStructuresByName('aspirin')
    expect(results).toEqual([])
  })
})
