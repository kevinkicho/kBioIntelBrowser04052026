import { getUniChemMappings, getUniChemCrossRefs, getAllCompoundIds } from '@/lib/api/unichem'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const aspirinCompounds = {
  compounds: [
    {
      standardInchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      sources: [
        { sourceID: 1, shortName: 'chembl', src_compound_id: 'CHEMBL25' },
        { sourceID: 22, shortName: 'pubchem', src_compound_id: '2244' },
      ],
    },
  ],
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getUniChemMappings', () => {
  test('returns mapped sources on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(aspirinCompounds))
    const rows = await getUniChemMappings('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.some((r) => r.sourceName === 'chembl' && r.externalId === 'CHEMBL25')).toBe(true)
  })

  test('true empty compounds JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ compounds: [] }))
    expect(await getUniChemMappings('UNKNOWNKEY-UHFFFAOYSA-N')).toEqual([])
  })

  test('blank key is empty without fetch', async () => {
    expect(await getUniChemMappings('  ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getUniChemMappings('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getUniChemMappings('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getUniChemMappings('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).rejects.toThrow(/HTML/)
  })
})

describe('getUniChemCrossRefs / getAllCompoundIds', () => {
  test('unknown source is empty without fetch', async () => {
    expect(await getUniChemCrossRefs('not-a-db', '1')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getUniChemCrossRefs('pubchem', '2244')).rejects.toThrow(/HTTP 502/)
  })

  test('getAllCompoundIds throws when HTTP-fail (not empty shell)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getAllCompoundIds('pubchem', '2244')).rejects.toThrow(/HTTP 503/)
  })
})
