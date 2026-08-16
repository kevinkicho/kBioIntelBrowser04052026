import { searchGSRS, getGSRSByUNII } from '@/lib/api/gsrs'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const aspirinSubstance = {
  uuid: 'R16CO5Y76E',
  unii: 'R16CO5Y76E',
  name: 'ASPIRIN',
  type: 'CHEMICAL',
  names: [{ name: 'ASPIRIN', type: 'COMMON_NAME' }],
  structure: { smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', formula: 'C9H8O4', molecularWeight: 180.16 },
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('searchGSRS', () => {
  test('returns mapped substances on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ content: [aspirinSubstance] }))
    const rows = await searchGSRS('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].unii).toBe('R16CO5Y76E')
    expect(rows[0].name).toBe('ASPIRIN')
    expect(rows[0].url).toContain('R16CO5Y76E')
  })

  test('true empty content JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ content: [] }))
    expect(await searchGSRS('unknownxyz')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchGSRS('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchGSRS('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchGSRS('aspirin')).rejects.toThrow(/HTML/)
  })
})

describe('getGSRSByUNII', () => {
  test('returns substance on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(aspirinSubstance))
    const row = await getGSRSByUNII('R16CO5Y76E')
    expect(row?.unii).toBe('R16CO5Y76E')
    expect(row?.name).toBe('ASPIRIN')
  })

  test('throws when HTTP-fail (not silent miss)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGSRSByUNII('R16CO5Y76E')).rejects.toThrow(/HTTP 503/)
  })
})