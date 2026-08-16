import { getNciConceptsByName } from '@/lib/api/nci-thesaurus'

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
beforeEach(() => jest.resetAllMocks())

describe('getNciConceptsByName', () => {
  test('returns parsed concepts on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        concepts: [
          {
            code: 'C61948',
            name: 'Aspirin',
            terminology: 'ncit',
            conceptStatus: 'Retired_Concept',
            leaf: true,
          },
        ],
      }),
    )
    const results = await getNciConceptsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].code).toBe('C61948')
    expect(results[0].name).toBe('Aspirin')
    expect(results[0].conceptStatus).toBe('Retired_Concept')
    expect(results[0].leaf).toBe(true)
    expect(results[0].url).toContain('C61948')
  })

  test('defaults conceptStatus to DEFAULT when missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        concepts: [{ code: 'C1234', name: 'Test', terminology: 'ncit' }],
      }),
    )
    const results = await getNciConceptsByName('test')
    expect(results[0].conceptStatus).toBe('DEFAULT')
    expect(results[0].leaf).toBe(false)
  })

  test('true empty JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ concepts: [] }))
    expect(await getNciConceptsByName('unknownxyz')).toEqual([])
  })

  test('short name is empty without fetch', async () => {
    expect(await getNciConceptsByName('a')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getNciConceptsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getNciConceptsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getNciConceptsByName('aspirin')).rejects.toThrow(/HTML/)
  })
})
