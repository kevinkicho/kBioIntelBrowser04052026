import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'
import { mockJsonResponse } from '../utils/mockFetch'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPharmacologyTargetsByName', () => {
  test('returns parsed pharmacology targets on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 7314, name: 'liraglutide' }])
    )
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
    expect(results[0].url).toBe('https://www.guidetopharmacology.org/GRAC/ObjectDisplayForward?objectId=1')
    expect(results[1].type).toBe('partial agonist')
    expect(results[1].actionType).toBe('partial agonist')
  })

  test('true empty ligand search JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse([]))
    const results = await getPharmacologyTargetsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws when ligand search HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}, { status: 503 }))
    await expect(getPharmacologyTargetsByName('unknownxyz')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when interactions fetch HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 7314, name: 'liraglutide' }])
    )
    ;(fetch as jest.Mock).mockResolvedValueOnce(mockJsonResponse({}, { status: 503 }))
    await expect(getPharmacologyTargetsByName('liraglutide')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPharmacologyTargetsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('limits results to 15', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 1, name: 'aspirin' }])
    )
    const manyTargets = Array.from({ length: 20 }, (_, i) => ({
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
    expect(results).toHaveLength(15)
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

  test('throws when ligand response exceeds size limit (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      mockJsonResponse([{ ligandId: 1 }], {
        headers: { 'content-length': String(3 * 1024 * 1024) },
      }),
    )
    await expect(getPharmacologyTargetsByName('huge')).rejects.toThrow(/too large/)
  })

  test('throws when body is HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    )
    await expect(getPharmacologyTargetsByName('html')).rejects.toThrow(/HTML/)
  })

  test('blank or short query is empty without fetch', async () => {
    expect(await getPharmacologyTargetsByName('')).toEqual([])
    expect(await getPharmacologyTargetsByName('a')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
