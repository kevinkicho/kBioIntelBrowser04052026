import { getDrugLabelsByName } from '@/lib/api/dailymed'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugLabelsByName', () => {
  test('returns parsed labels on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          setid: 'abc-123', title: 'METFORMIN HYDROCHLORIDE tablet',
          published_date: '2024-01-15',
          products: [{ dosage_form: 'TABLET', route: 'ORAL', labeler_name: 'Teva Pharmaceuticals' }],
        }],
      }),
    })
    const labels = await getDrugLabelsByName('metformin')
    expect(labels).toHaveLength(1)
    expect(labels[0].title).toBe('METFORMIN HYDROCHLORIDE tablet')
    expect(labels[0].setId).toBe('abc-123')
    expect(labels[0].publishedDate).toBe('2024-01-15')
    expect(labels[0].dosageForm).toBe('TABLET')
    expect(labels[0].route).toBe('ORAL')
    expect(labels[0].labelerName).toBe('Teva Pharmaceuticals')
    expect(labels[0].dailyMedUrl).toBe('https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123')
  })

  test('returns empty array when no data', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
    expect(await getDrugLabelsByName('unknownxyz')).toEqual([])
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getDrugLabelsByName('metformin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getDrugLabelsByName('metformin')).toEqual([])
  })

  test('handles missing product fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ setid: 'xyz-456', title: 'Some Drug', published_date: '2023-06-01', products: [] }] }),
    })
    const labels = await getDrugLabelsByName('something')
    expect(labels).toHaveLength(1)
    expect(labels[0].dosageForm).toBe('')
    expect(labels[0].route).toBe('')
    expect(labels[0].labelerName).toBe('')
  })
})
