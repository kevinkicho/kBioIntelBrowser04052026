import { getPharosTargetsByName } from '@/lib/api/pharos'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getPharosTargetsByName', () => {
  test('returns parsed Pharos targets on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
    })
    const results = await getPharosTargetsByName('lisinopril')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Angiotensin-converting enzyme')
    expect(results[0].tdl).toBe('Tclin')
    expect(results[0].family).toBe('Enzyme')
    expect(results[0].novelty).toBe(3.5)
    expect(results[0].url).toContain('pharos.nih.gov/targets/ACE')
  })

  test('uses Number() coercion for novelty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          targets: {
            targets: [{ name: 'T', tdl: 'Tbio', fam: '', description: '', novelty: '2.1', sym: 'T' }],
          },
        },
      }),
    })
    const results = await getPharosTargetsByName('test')
    expect(results[0].novelty).toBe(2.1)
  })

  test('sends POST request with GraphQL query', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { targets: { targets: [] } } }),
    })
    await getPharosTargetsByName('aspirin')
    expect(fetch).toHaveBeenCalledWith(
      'https://pharos-api.ncats.io/graphql',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('returns empty array when API returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getPharosTargetsByName('aspirin')).toEqual([])
  })

  test('returns empty array when targets key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: null }),
    })
    expect(await getPharosTargetsByName('aspirin')).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getPharosTargetsByName('aspirin')).toEqual([])
  })

  test('limits results to 10', async () => {
    const manyTargets = Array.from({ length: 15 }, (_, i) => ({
      name: `Target${i}`, tdl: 'Tbio', fam: '', description: '', novelty: 0, sym: `T${i}`,
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { targets: { targets: manyTargets } } }),
    })
    const results = await getPharosTargetsByName('aspirin')
    expect(results).toHaveLength(10)
  })
})
