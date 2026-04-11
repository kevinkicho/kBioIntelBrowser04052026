import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPharmacologyTargetsByName', () => {
  test('returns parsed pharmacology targets on success', async () => {
    // First fetch: ligand search
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        { ligandId: 7314, name: 'liraglutide' },
      ]),
    })
    // Second fetch: interactions
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          targetName: 'GLP1R',
          type: 'agonist',
          action: 'agonist',
          affinity_median: 0.52,
          affinity_units: 'nM',
          species: 'Human',
          primaryTarget: true,
        },
        {
          targetName: 'GLP2R',
          type: null,
          action: 'partial agonist',
          affinity_median: 120,
          affinity_units: 'nM',
          species: 'Human',
          primaryTarget: false,
        },
      ]),
    })
    const results = await getPharmacologyTargetsByName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].targetName).toBe('GLP1R')
    expect(results[0].type).toBe('agonist')
    expect(results[0].affinity).toBe(0.52)
    expect(results[0].species).toBe('Human')
    expect(results[0].primaryTarget).toBe(true)
    expect(results[0].url).toBe('https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314')
    expect(results[1].type).toBe('partial agonist')
  })

  test('returns empty array when ligand search returns no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    const results = await getPharmacologyTargetsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when ligand search is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getPharmacologyTargetsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when interactions fetch is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ ligandId: 7314, name: 'liraglutide' }]),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getPharmacologyTargetsByName('liraglutide')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getPharmacologyTargetsByName('aspirin')
    expect(results).toEqual([])
  })

  test('limits results to 10', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ ligandId: 1, name: 'aspirin' }]),
    })
    const manyTargets = Array.from({ length: 15 }, (_, i) => ({
      targetName: `Target${i}`,
      type: 'inhibitor',
      action: 'inhibitor',
      affinity_median: i * 10,
      affinity_units: 'nM',
      species: 'Human',
      primaryTarget: false,
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => manyTargets,
    })
    const results = await getPharmacologyTargetsByName('aspirin')
    expect(results).toHaveLength(10)
  })

  test('handles missing affinity values gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ ligandId: 42, name: 'test' }]),
    })
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          targetName: 'SomeTarget',
          type: null,
          action: null,
          affinity_median: null,
          affinity_units: null,
          species: 'Mouse',
          primaryTarget: false,
        },
      ]),
    })
    const results = await getPharmacologyTargetsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('')
    expect(results[0].affinity).toBeUndefined()
  })
})
