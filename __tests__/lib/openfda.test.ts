import { getDrugsByIngredient } from '@/lib/api/openfda'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('getDrugsByIngredient', () => {
  test('returns company products for a known drug ingredient', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
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
    }))

    const products = await getDrugsByIngredient('liraglutide')
    expect(products).toHaveLength(1)
    expect(products[0].company).toBe('Novo Nordisk')
    expect(products[0].brandName).toBe('Victoza')
    expect(products[0].genericName).toBe('LIRAGLUTIDE')
  })

  test('returns empty array when no drugs found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const products = await getDrugsByIngredient('xyznotadrug')
    expect(products).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    await expect(getDrugsByIngredient('insulin')).rejects.toThrow(/Network error/)
  })
})
