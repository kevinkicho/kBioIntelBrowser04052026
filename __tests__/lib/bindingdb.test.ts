import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getBindingAffinitiesByName', () => {
  test('returns parsed binding affinities on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [
          {
            monomerID: 'BDBM50420027',
            target_name: 'GLP-1 receptor',
            Ki: '0.52',
            Kd: '',
            IC50: '',
            EC50: '',
            kon: '',
            koff: '',
            reference: 'Knudsen et al 2010',
            doi: '10.1021/jm901513s',
          },
          {
            monomerID: 'BDBM50420028',
            target_name: 'GLP-2 receptor',
            Ki: '',
            Kd: '120.0',
            IC50: '',
            EC50: '',
            kon: '',
            koff: '',
            reference: 'Smith et al 2012',
            doi: '10.1021/jm901999x',
          },
        ],
      }),
    })
    const results = await getBindingAffinitiesByName('liraglutide')
    expect(results).toHaveLength(2)
    expect(results[0].targetName).toBe('GLP-1 receptor')
    expect(results[0].affinityType).toBe('Ki')
    expect(results[0].affinityValue).toBe(0.52)
    expect(results[0].affinityUnits).toBe('nM')
    expect(results[0].source).toBe('Knudsen et al 2010')
    expect(results[0].doi).toBe('10.1021/jm901513s')
    expect(results[1].affinityType).toBe('Kd')
    expect(results[1].affinityValue).toBe(120)
  })

  test('skips entries with no affinity values', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [
          {
            monomerID: 'BDBM1',
            target_name: 'Some Target',
            Ki: '',
            Kd: '',
            IC50: '',
            EC50: '',
            kon: '',
            koff: '',
            reference: '',
            doi: '',
          },
        ],
      }),
    })
    const results = await getBindingAffinitiesByName('liraglutide')
    expect(results).toEqual([])
  })

  test('returns empty array when API response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getBindingAffinitiesByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('returns empty array when molecules key is missing', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })
    const results = await getBindingAffinitiesByName('aspirin')
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getBindingAffinitiesByName('aspirin')
    expect(results).toEqual([])
  })

  test('limits results to 10', async () => {
    const manyMolecules = Array.from({ length: 20 }, (_, i) => ({
      monomerID: `BDBM${i}`,
      target_name: `Target${i}`,
      Ki: `${i + 1}.0`,
      Kd: '',
      IC50: '',
      EC50: '',
      kon: '',
      koff: '',
      reference: '',
      doi: '',
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ molecules: manyMolecules }),
    })
    const results = await getBindingAffinitiesByName('aspirin')
    expect(results).toHaveLength(10)
  })

  test('uses Number() coercion for affinityValue', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        molecules: [
          {
            monomerID: 'BDBM1',
            target_name: 'Target',
            Ki: '1.5e2',
            Kd: '',
            IC50: '',
            EC50: '',
            kon: '',
            koff: '',
            reference: '',
            doi: '',
          },
        ],
      }),
    })
    const results = await getBindingAffinitiesByName('test')
    expect(results[0].affinityValue).toBe(150)
  })
})
