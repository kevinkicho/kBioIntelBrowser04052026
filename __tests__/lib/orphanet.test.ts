import { searchOrphanetDiseases, getOrphanetGenes } from '@/lib/api/orphanet'

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

describe('searchOrphanetDiseases', () => {
  test('returns parsed diseases on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: [{ ORPHAcode: '18', PreferredTerm: 'ATTR amyloidosis' }],
      }),
    )
    const results = await searchOrphanetDiseases('ATTR')
    expect(results).toHaveLength(1)
    expect(results[0].orphaCode).toBe('18')
    expect(results[0].diseaseName).toBe('ATTR amyloidosis')
  })

  test('true empty JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await searchOrphanetDiseases('obscurexyz')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchOrphanetDiseases('ATTR')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchOrphanetDiseases('ATTR')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(searchOrphanetDiseases('ATTR')).rejects.toThrow(/HTML/)
  })
})

describe('getOrphanetGenes', () => {
  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getOrphanetGenes('18')).rejects.toThrow(/HTTP 503/)
  })

  test('404 is empty (resource not found)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getOrphanetGenes('999999')).toEqual([])
  })
})