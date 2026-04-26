import { getGeneExpressionBySymbols } from '@/lib/api/expression-atlas'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getGeneExpressionBySymbols', () => {
  test('returns parsed gene expression data on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experiments: [
          {
            experimentAccession: 'E-MTAB-123',
            experimentDescription: 'Baseline expression in tissues',
            species: 'Homo sapiens',
            experimentType: 'RNASEQ_MRNA_BASELINE',
          },
        ],
      }),
    })
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results).toHaveLength(1)
    expect(results[0].experimentDescription).toBe('Baseline expression in tissues')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].experimentType).toBe('RNASEQ_MRNA_BASELINE')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123')
  })

  test('deduplicates experiments across symbols', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        experiments: [
          {
            experimentAccession: 'E-MTAB-123',
            experimentDescription: 'Shared experiment',
            species: 'Homo sapiens',
            experimentType: 'RNASEQ_MRNA_BASELINE',
          },
        ],
      }),
    }
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          experiments: [
            {
              experimentAccession: 'E-MTAB-123',
              experimentDescription: 'Shared experiment',
              species: 'Homo sapiens',
              experimentType: 'RNASEQ_MRNA_BASELINE',
            },
          ],
        }),
      })
    const results = await getGeneExpressionBySymbols(['ACE', 'REN'])
    expect(results).toHaveLength(1)
  })

  test('limits symbols to 3', async () => {
    const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ experiments: [] }),
      headers: new Headers({ 'content-type': 'application/json' }),
    })
    await getGeneExpressionBySymbols(symbols)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  test('returns empty array for empty symbols', async () => {
    expect(await getGeneExpressionBySymbols([])).toEqual([])
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getGeneExpressionBySymbols(['ACE'])).toEqual([])
  })
})
