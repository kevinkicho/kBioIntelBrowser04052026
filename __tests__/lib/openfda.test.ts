import { getDrugsByIngredient } from '@/lib/api/openfda'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getDrugsByIngredient', () => {
  test('returns company products for a known drug ingredient', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          openfda: {
            manufacturer_name: ['Novo Nordisk'],
            brand_name: ['Victoza'],
            generic_name: ['LIRAGLUTIDE'],
            product_type: ['HUMAN PRESCRIPTION DRUG'],
            route: ['SUBCUTANEOUS'],
            application_number: ['NDA022341'],
          },
        }],
      }),
    })

    const products = await getDrugsByIngredient('liraglutide')
    expect(products).toHaveLength(1)
    expect(products[0].company).toBe('Novo Nordisk')
    expect(products[0].brandName).toBe('Victoza')
    expect(products[0].genericName).toBe('LIRAGLUTIDE')
  })

  test('returns empty array when no drugs found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })
    const products = await getDrugsByIngredient('xyznotadrug')
    expect(products).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    const products = await getDrugsByIngredient('insulin')
    expect(products).toEqual([])
  })
})
