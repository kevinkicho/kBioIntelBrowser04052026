import { getProteinFeaturesByAccessions } from '@/lib/api/ebi-proteins'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getProteinFeaturesByAccessions', () => {
  test('returns parsed features on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          {
            type: 'ACTIVE_SITE',
            description: 'Zinc-binding',
            begin: '361',
            end: '361',
          },
          {
            type: 'CHAIN',
            description: 'Full-length chain',
            begin: '1',
            end: '1306',
          },
        ],
      }),
    })
    const results = await getProteinFeaturesByAccessions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('ACTIVE_SITE')
    expect(results[0].description).toBe('Zinc-binding')
    expect(results[0].start).toBe(361)
    expect(results[0].end).toBe(361)
    expect(results[0].url).toBe('https://www.uniprot.org/uniprot/P12821#ACTIVE_SITE')
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getProteinFeaturesByAccessions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getProteinFeaturesByAccessions(['P12821'])
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getProteinFeaturesByAccessions(['P12821'])).toEqual([])
  })

  test('limits to first 3 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ type: 'BINDING', description: '', begin: '1', end: '2' }] }),
    })
    await getProteinFeaturesByAccessions(['A1', 'A2', 'A3', 'A4', 'A5'])
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('limits total features to 15', async () => {
    const manyFeatures = Array.from({ length: 20 }, (_, i) => ({
      type: 'BINDING',
      description: `Feature ${i}`,
      begin: String(i),
      end: String(i + 1),
    }))
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: manyFeatures }),
    })
    const results = await getProteinFeaturesByAccessions(['P12821'])
    expect(results).toHaveLength(15)
  })
})
