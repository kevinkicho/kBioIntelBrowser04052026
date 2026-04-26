import { getBioAssaysByName } from '@/lib/api/bioassay'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getBioAssaysByName', () => {
  test('returns parsed bioassay results on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        Table: {
          Columns: {
            Column: [
              'AID',
              'Assay Name',
              'Activity Outcome',
              'Target Accession',
              'Activity Value [uM]',
            ],
          },
          Row: [
            { Cell: [12345, 'Cytotoxicity assay', 'Active', 'EGFR', 5.2] },
          ],
        },
      })
    )
    const results = await getBioAssaysByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].assayId).toBe('12345')
    expect(results[0].assayName).toBe('Cytotoxicity assay')
    expect(results[0].outcome).toBe('Active')
    expect(results[0].targetName).toBe('EGFR')
    expect(results[0].activityValue).toBe(5.2)
    expect(results[0].url).toBe('https://pubchem.ncbi.nlm.nih.gov/bioassay/12345')
  })

  test('limits results to 10', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      Cell: [i + 1, `Assay ${i}`, 'Active', 'Target', 1.0],
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        Table: {
          Columns: {
            Column: [
              'AID',
              'Assay Name',
              'Activity Outcome',
              'Target Accession',
              'Activity Value [uM]',
            ],
          },
          Row: rows,
        },
      })
    )
    const results = await getBioAssaysByName('test')
    expect(results).toHaveLength(10)
  })

  test('defaults activityValue to 0 when missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({
        Table: {
          Columns: {
            Column: [
              'AID',
              'Assay Name',
              'Activity Outcome',
              'Target Accession',
              'Activity Value [uM]',
            ],
          },
          Row: [{ Cell: [100, 'Test', 'Inactive', 'TP53', null] }],
        },
      })
    )
    const results = await getBioAssaysByName('test')
    expect(results[0].activityValue).toBe(0)
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    expect(await getBioAssaysByName('test')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getBioAssaysByName('test')).toEqual([])
  })

  test('returns empty array when Table is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}))
    expect(await getBioAssaysByName('test')).toEqual([])
  })
})
