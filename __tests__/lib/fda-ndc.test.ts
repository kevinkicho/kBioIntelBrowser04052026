import { getNdcProductsByName } from '@/lib/api/fda-ndc'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getNdcProductsByName', () => {
  test('returns parsed NDC products on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            product_ndc: '0002-3227',
            brand_name: 'PROZAC',
            generic_name: 'FLUOXETINE HYDROCHLORIDE',
            dosage_form: 'CAPSULE',
            route: ['ORAL'],
            marketing_category: 'NDA',
            labeler_name: 'Eli Lilly and Company',
            product_type: 'HUMAN PRESCRIPTION DRUG',
            openfda: {
              pharm_class_epc: ['Serotonin Reuptake Inhibitor [EPC]'],
            },
          },
        ],
      }),
    })
    const results = await getNdcProductsByName('fluoxetine')
    expect(results).toHaveLength(1)
    expect(results[0].productNdc).toBe('0002-3227')
    expect(results[0].brandName).toBe('PROZAC')
    expect(results[0].genericName).toBe('FLUOXETINE HYDROCHLORIDE')
    expect(results[0].dosageForm).toBe('CAPSULE')
    expect(results[0].route).toBe('ORAL')
    expect(results[0].marketingCategory).toBe('NDA')
    expect(results[0].labelerName).toBe('Eli Lilly and Company')
    expect(results[0].productType).toBe('HUMAN PRESCRIPTION DRUG')
    expect(results[0].pharmClass).toEqual(['Serotonin Reuptake Inhibitor [EPC]'])
    expect(results[0].url).toContain('0002-3227')
  })

  test('joins multiple routes', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            product_ndc: '0001-0001',
            route: ['ORAL', 'INTRAVENOUS'],
          },
        ],
      }),
    })
    const results = await getNdcProductsByName('test')
    expect(results[0].route).toBe('ORAL, INTRAVENOUS')
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getNdcProductsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when results key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getNdcProductsByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getNdcProductsByName('aspirin')
    expect(results).toEqual([])
  })
})
