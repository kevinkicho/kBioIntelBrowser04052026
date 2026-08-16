import { getPharosTargetsByName, getPharosTdlBySymbol } from '@/lib/api/pharos'

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

describe('getPharosTargetsByName', () => {
  test('returns parsed Pharos targets on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: {
          targets: {
            targets: [
              {
                name: 'Angiotensin-converting enzyme',
                tdl: 'Tclin',
                fam: 'Enzyme',
                description: 'Converts angiotensin I to angiotensin II',
                novelty: 3.5,
                sym: 'ACE',
              },
            ],
          },
        },
      }),
    )
    const results = await getPharosTargetsByName('lisinopril')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Angiotensin-converting enzyme')
    expect(results[0].tdl).toBe('Tclin')
    expect(results[0].family).toBe('Enzyme')
    expect(results[0].novelty).toBe(3.5)
    expect(results[0].url).toContain('pharos.nih.gov/targets/ACE')
  })

  test('uses Number() coercion for novelty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: {
          targets: {
            targets: [{ name: 'T', tdl: 'Tbio', fam: '', description: '', novelty: '2.1', sym: 'T' }],
          },
        },
      }),
    )
    const results = await getPharosTargetsByName('test')
    expect(results[0].novelty).toBe(2.1)
  })

  test('sends POST request with GraphQL query', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { targets: { targets: [] } } }))
    await getPharosTargetsByName('aspirin')
    expect(fetch).toHaveBeenCalledWith(
      'https://pharos-api.ncats.io/graphql',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('true empty targets JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { targets: { targets: [] } } }))
    expect(await getPharosTargetsByName('aspirin')).toEqual([])
  })

  test('true empty when targets key is missing is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: null }))
    expect(await getPharosTargetsByName('aspirin')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPharosTargetsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getPharosTargetsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getPharosTargetsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on GraphQL errors (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ errors: [{ message: 'boom' }] }))
    await expect(getPharosTargetsByName('aspirin')).rejects.toThrow(/GraphQL/)
  })

  test('limits results to 10', async () => {
    const manyTargets = Array.from({ length: 15 }, (_, i) => ({
      name: `Target${i}`, tdl: 'Tbio', fam: '', description: '', novelty: 0, sym: `T${i}`,
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { targets: { targets: manyTargets } } }))
    const results = await getPharosTargetsByName('aspirin')
    expect(results).toHaveLength(10)
  })
})

describe('getPharosTdlBySymbol', () => {
  test('returns TDL on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({ data: { target: { name: 'EGFR', tdl: 'Tclin', sym: 'EGFR' } } }),
    )
    const hit = await getPharosTdlBySymbol('EGFR')
    expect(hit?.tdl).toBe('Tclin')
    expect(hit?.url).toContain('pharos.nih.gov/targets/EGFR')
  })

  test('true miss is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { target: null } }))
    expect(await getPharosTdlBySymbol('NOSUCH')).toBeNull()
  })

  test('blank symbol is null without fetch', async () => {
    expect(await getPharosTdlBySymbol('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not silent miss)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getPharosTdlBySymbol('EGFR')).rejects.toThrow(/HTTP 503/)
  })
})
