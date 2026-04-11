import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getGoAnnotationsByAccessions', () => {
  test('returns parsed annotations on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            goId: 'GO:0004180',
            goName: 'carboxypeptidase activity',
            goAspect: 'molecular_function',
            goEvidence: 'IDA',
            qualifier: 'enables',
          },
        ],
      }),
    })
    const results = await getGoAnnotationsByAccessions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].goId).toBe('GO:0004180')
    expect(results[0].goName).toBe('carboxypeptidase activity')
    expect(results[0].goAspect).toBe('molecular_function')
    expect(results[0].evidence).toBe('IDA')
    expect(results[0].qualifier).toBe('enables')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/QuickGO/term/GO:0004180')
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getGoAnnotationsByAccessions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('returns empty array when response is not ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getGoAnnotationsByAccessions(['P12821'])
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getGoAnnotationsByAccessions(['P12821'])).toEqual([])
  })

  test('deduplicates annotations by goId across accessions', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ goId: 'GO:0001', goAspect: 'molecular_function', goEvidence: 'IDA', qualifier: '' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ goId: 'GO:0001', goAspect: 'molecular_function', goEvidence: 'IDA', qualifier: '' }],
        }),
      })
    const results = await getGoAnnotationsByAccessions(['P12821', 'Q9Y5Y4'])
    expect(results).toHaveLength(1)
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ goId: 'GO:0001', goAspect: '', goEvidence: '', qualifier: '' }] }),
    })
    await getGoAnnotationsByAccessions(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })
})
