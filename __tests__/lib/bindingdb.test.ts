import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { getChemblActivitiesByName } from '@/lib/api/chembl'

jest.mock('@/lib/api/chembl', () => ({
  getChemblActivitiesByName: jest.fn(),
}))

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

describe('getBindingAffinitiesByName', () => {
  test('maps ChEMBL affinity rows', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([
      {
        chemblId: 'CHEMBL1',
        targetName: 'GLP-1 receptor',
        targetChemblId: 'CHEMBL2',
        standardType: 'Ki',
        standardValue: 0.52,
        standardUnits: 'nM',
      },
    ])
    const results = await getBindingAffinitiesByName('liraglutide')
    expect(results).toHaveLength(1)
    expect(results[0].targetName).toBe('GLP-1 receptor')
    expect(results[0].affinityType).toBe('Ki')
    expect(results[0].affinityValue).toBe(0.52)
    expect(results[0].source).toBe('ChEMBL')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('blank query is true empty without fetch', async () => {
    expect(await getBindingAffinitiesByName('')).toEqual([])
    expect(getChemblActivitiesByName).not.toHaveBeenCalled()
  })

  test('true empty when ChEMBL has no rows and name is not an accession', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    const results = await getBindingAffinitiesByName('unknownxyz')
    expect(results).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('rethrows ChEMBL HTTP error (not EMPTY)', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValueOnce(new Error('HTTP 503'))
    await expect(getBindingAffinitiesByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('BindingDB REST 404 on accession is true empty', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const results = await getBindingAffinitiesByName('P01308')
    expect(results).toEqual([])
  })

  test('throws on BindingDB REST HTTP 503 (not EMPTY)', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getBindingAffinitiesByName('P01308')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on BindingDB REST HTML (not EMPTY)', async () => {
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValueOnce([])
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>', 200, 'text/html'))
    await expect(getBindingAffinitiesByName('P01308')).rejects.toThrow(/HTML/)
  })
})
