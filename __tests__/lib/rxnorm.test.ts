import { getRxcuiByName, getDrugInteractionsByName } from '@/lib/api/rxnorm'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getRxcuiByName', () => {
  test('returns RxCUI on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: { rxnormId: ['6809'] } }),
    })
    const id = await getRxcuiByName('metformin')
    expect(id).toBe('6809')
  })

  test('returns null when no RxCUI found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: {} }),
    })
    const id = await getRxcuiByName('unknownxyz')
    expect(id).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const id = await getRxcuiByName('metformin')
    expect(id).toBeNull()
  })
})

describe('getDrugInteractionsByName', () => {
  test('returns parsed interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: { rxnormId: ['6809'] } }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        interactionTypeGroup: [{
          sourceName: 'DrugBank',
          interactionType: [{
            interactionPair: [{
              interactionConcept: [
                { minConceptItem: { name: 'metformin', rxcui: '6809' } },
                { minConceptItem: { name: 'warfarin', rxcui: '11289' } },
              ],
              description: 'Metformin may increase the anticoagulant effect of warfarin.',
              severity: 'moderate',
            }],
          }],
        }],
      }),
    })
    const results = await getDrugInteractionsByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].drugName).toBe('warfarin')
    expect(results[0].severity).toBe('moderate')
    expect(results[0].description).toBe('Metformin may increase the anticoagulant effect of warfarin.')
    expect(results[0].sourceName).toBe('DrugBank')
  })

  test('returns empty array when RxCUI not found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: {} }),
    })
    const results = await getDrugInteractionsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when no interactions found', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ idGroup: { rxnormId: ['6809'] } }),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getDrugInteractionsByName('metformin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getDrugInteractionsByName('metformin')
    expect(results).toEqual([])
  })
})
