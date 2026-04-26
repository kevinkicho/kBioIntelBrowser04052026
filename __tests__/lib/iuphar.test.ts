import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPharmacologyTargetsByName', () => {
  test('returns parsed pharmacology targets on success', async () => {
    // First fetch: ligand search
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 7314, name: 'liraglutide' }])
    )
    // Second fetch: interactions
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([
        {
          targetId: 1,
          targetName: 'GLP1R',
          targetSpecies: 'Human',
          ligandId: 7314,
          ligandName: 'liraglutide',
          type: 'Agonist',
          action: 'agonist',
          selectivity: null,
          affinity: '0.52',
          affinityParameter: 'pKi',
          primaryTarget: true,
          refIds: [],
        },
        {
          targetId: 2,
          targetName: 'GLP2R',
          targetSpecies: 'Human',
          ligandId: 7314,
          ligandName: 'liraglutide',
          type: null,
          action: 'partial agonist',
          selectivity: null,
          affinity: '120',
          affinityParameter: 'pKi',
          primaryTarget: false,
          refIds: [],
        },
      ])
    )
    const results = await getPharmacologyTargetsByName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].targetName).toBe('GLP1R')
    expect(results[0].type).toBe('Agonist')
    expect(results[0].affinity).toBe(0.52)
    expect(results[0].species).toBe('Human')
    expect(results[0].primaryTarget).toBe(true)
    expect(results[0].url).toBe('https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=7314')
    expect(results[1].type).toBe('')
    // actionType falls back to action when type is null
    expect(results[1].actionType).toBe('partial agonist')
  })

  test('returns empty array when ligand search returns no results', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
    const results = await getPharmacologyTargetsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when ligand search is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    const results = await getPharmacologyTargetsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when interactions fetch is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 7314, name: 'liraglutide' }])
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse({}, { status: 500 })
    )
    const results = await getPharmacologyTargetsByName('liraglutide')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getPharmacologyTargetsByName('aspirin')
    expect(results).toEqual([])
  })

  test('limits results to 10', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 1, name: 'aspirin' }])
    )
    const manyTargets = Array.from({ length: 15 }, (_, i) => ({
      targetId: i,
      targetName: `Target${i}`,
      targetSpecies: 'Human',
      ligandId: 1,
      ligandName: 'aspirin',
      type: 'Inhibitor',
      action: 'inhibitor',
      selectivity: null,
      affinity: String(i * 10),
      affinityParameter: 'pKi',
      primaryTarget: false,
      refIds: [],
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse(manyTargets))
    const results = await getPharmacologyTargetsByName('aspirin')
    expect(results).toHaveLength(10)
  })

  test('handles missing affinity values gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 42, name: 'test' }])
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([
        {
          targetId: 1,
          targetName: 'SomeTarget',
          targetSpecies: 'Mouse',
          ligandId: 42,
          ligandName: 'test',
          type: null,
          action: null,
          selectivity: null,
          affinity: null,
          affinityParameter: null,
          primaryTarget: false,
          refIds: [],
        },
      ])
    )
    const results = await getPharmacologyTargetsByName('test')
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('')
    expect(results[0].affinity).toBeUndefined()
  })
})
