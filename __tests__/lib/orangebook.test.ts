import { getOrangeBookByName } from '@/lib/api/orangebook'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getOrangeBookByName', () => {
  test('returns parsed Orange Book entries on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            application_number: 'NDA021457',
            sponsor_name: 'NOVO NORDISK',
            submissions: [
              { submission_date: '20240315', submission_type: 'ORIG', submission_status: 'AP' },
            ],
            products: [
              {
                active_ingredients: [{ name: 'LIRAGLUTIDE' }],
                dosage_form: 'INJECTABLE',
                te_code: 'BX',
              },
            ],
            openfda: { generic_name: ['LIRAGLUTIDE'] },
          },
        ],
      }),
    })
    const results = await getOrangeBookByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].applicationNumber).toBe('NDA021457')
    expect(results[0].sponsorName).toBe('NOVO NORDISK')
    expect(results[0].dosageForm).toBe('INJECTABLE')
    expect(results[0].teCode).toBe('BX')
    expect(results[0].activeIngredient).toBe('LIRAGLUTIDE')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getOrangeBookByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getOrangeBookByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getOrangeBookByName('aspirin')
    expect(results).toEqual([])
  })
})
