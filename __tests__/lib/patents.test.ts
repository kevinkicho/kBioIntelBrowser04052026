import { getPatentsByMoleculeName } from '@/lib/api/patents'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPatentsByMoleculeName', () => {
  test('returns parsed PubChem patent xrefs on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({
      InformationList: {
        Information: [{ PatentID: ['US8114833', 'US9000001'] }],
      },
    }))
    const results = await getPatentsByMoleculeName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].patentNumber).toBe('US8114833')
    expect(results[0].title).toBe('Patent US8114833')
    expect(results[0].abstract).toMatch(/PubChem patent xref US8114833/)
  })

  test('404 no-xrefs is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const results = await getPatentsByMoleculeName('unknownxyz')
    expect(results).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPatentsByMoleculeName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getPatentsByMoleculeName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('returns empty array when PatentID list is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}))
    const results = await getPatentsByMoleculeName('aspirin')
    expect(results).toEqual([])
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPatentsByMoleculeName('aspirin')).rejects.toThrow(/network/)
  })

  test('empty name is EMPTY without network', async () => {
    const results = await getPatentsByMoleculeName('   ')
    expect(results).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
