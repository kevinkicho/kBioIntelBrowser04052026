import { getCompToxByName } from '@/lib/api/comptox'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getCompToxByName', () => {
  test('returns parsed CompTox data on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ dtxsid: 'DTXSID7020182', preferredName: 'Aspirin' }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          casRegistryNumber: '50-78-2',
          toxcastActiveAssays: '42',
          toxcastTotalAssays: '800',
          expocast: 'MEDIAN',
        }),
      })
    const result = await getCompToxByName('Aspirin')
    expect(result).not.toBeNull()
    expect(result!.dtxsid).toBe('DTXSID7020182')
    expect(result!.casNumber).toBe('50-78-2')
    expect(result!.toxcastActive).toBe(42)
    expect(result!.toxcastTotal).toBe(800)
    expect(result!.exposurePrediction).toBe('MEDIAN')
    expect(result!.url).toBe('https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182')
  })

  test('uses Number() coercion for toxcast fields and falls back to 0', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ dtxsid: 'DTXSID7020182' }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          casRegistryNumber: '50-78-2',
          toxcastActiveAssays: null,
          toxcastTotalAssays: undefined,
          expocast: '',
        }),
      })
    const result = await getCompToxByName('Aspirin')
    expect(result!.toxcastActive).toBe(0)
    expect(result!.toxcastTotal).toBe(0)
  })

  test('returns null when search returns empty array', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    })
    expect(await getCompToxByName('unknownxyz')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('returns null when search returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })

  test('returns null when detail fetch returns non-ok', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ dtxsid: 'DTXSID7020182' }]),
      })
      .mockResolvedValueOnce({ ok: false })
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })

  test('returns null when dtxsid is missing from search result', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ preferredName: 'Aspirin' }]),
    })
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })

  test('returns null on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getCompToxByName('Aspirin')).toBeNull()
  })
})
