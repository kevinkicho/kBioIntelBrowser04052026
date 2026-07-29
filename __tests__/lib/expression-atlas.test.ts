import {
  getGeneExpressionBySymbols,
  mapBaselineExperimentsToRows,
  hasAtlasExpressionLevel,
} from '@/lib/api/expression-atlas'

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('mapBaselineExperimentsToRows', () => {
  const sample = {
    columnHeaders: [
      { assayGroupId: 'breast', factorValue: 'breast', factorValueOntologyTermId: 'UBERON_0000310' },
      { assayGroupId: 'blood', factorValue: 'blood', factorValueOntologyTermId: 'UBERON_0000178' },
      { assayGroupId: 'liver', factorValue: 'liver', factorValueOntologyTermId: 'UBERON_0002107' },
    ],
    profiles: {
      rows: [
        {
          id: 'E-GTEX-8',
          name: 'GTEX - organism part',
          experimentType: 'RNASEQ_MRNA_BASELINE',
          expressions: [{ value: 2.5 }, {}, { value: 0.8 }],
        },
      ],
    },
    config: { expressionUnit: 'TPM', species: 'homo_sapiens' },
  }

  it('maps tissue cells with values and skips empty cells', () => {
    const rows = mapBaselineExperimentsToRows(sample, 'BRCA1')
    expect(rows).toHaveLength(2)
    expect(rows[0].tissueName).toBe('breast')
    expect(rows[0].expressionLevel).toBe(2.5)
    expect(rows[0].unit).toBe('TPM')
    expect(rows[0].url).toContain('E-GTEX-8')
    expect(rows[0].url).toContain('BRCA1')
    expect(rows.map((r) => r.tissueName).sort()).toEqual(['breast', 'liver'].sort())
    // Sorted high → low
    expect(rows[0].expressionLevel).toBeGreaterThanOrEqual(rows[1].expressionLevel)
  })

  it('hasAtlasExpressionLevel is false for NaN sentinel', () => {
    expect(hasAtlasExpressionLevel({ expressionLevel: Number.NaN })).toBe(false)
    expect(hasAtlasExpressionLevel({ expressionLevel: 0 })).toBe(true)
    expect(hasAtlasExpressionLevel({ expressionLevel: 1.2 })).toBe(true)
  })
})

describe('getGeneExpressionBySymbols', () => {
  test('prefers baseline_experiments with real levels', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columnHeaders: [{ factorValue: 'breast' }, { factorValue: 'liver' }],
        profiles: {
          rows: [
            {
              id: 'E-MTAB-1',
              name: 'Human baseline',
              experimentType: 'Baseline',
              expressions: [{ value: 3.1 }, { value: 0.4 }],
            },
          ],
        },
        config: { expressionUnit: 'TPM', species: 'homo_sapiens' },
      }),
    })
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results.length).toBe(2)
    expect(results[0].expressionLevel).toBe(3.1)
    expect(results[0].tissueName).toBe('breast')
    expect(hasAtlasExpressionLevel(results[0])).toBe(true)
    // Only baseline call — no second experiments fetch
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('falls back to experiments catalog without inventing levels', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ columnHeaders: [], profiles: { rows: [] } }),
      })
      .mockResolvedValueOnce({
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
    expect(results[0].url).toBe('https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123')
    expect(hasAtlasExpressionLevel(results[0])).toBe(false)
  })

  test('deduplicates experiments across symbols', async () => {
    const emptyBaseline = {
      ok: true,
      json: async () => ({ columnHeaders: [], profiles: { rows: [] } }),
    }
    const catalog = {
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
      .mockResolvedValueOnce(emptyBaseline)
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce(emptyBaseline)
      .mockResolvedValueOnce(catalog)
    const results = await getGeneExpressionBySymbols(['ACE', 'REN'])
    expect(results).toHaveLength(1)
  })

  test('limits symbols to 3', async () => {
    const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ columnHeaders: [], profiles: { rows: [] }, experiments: [] }),
      headers: new Headers({ 'content-type': 'application/json' }),
    })
    await getGeneExpressionBySymbols(symbols)
    // baseline + catalog per symbol, 3 symbols max
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  test('returns empty array for empty symbols', async () => {
    expect(await getGeneExpressionBySymbols([])).toEqual([])
  })

  test('returns empty array when fetch returns non-ok', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results).toEqual([])
  })

  test('returns empty array on network error', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    expect(await getGeneExpressionBySymbols(['ACE'])).toEqual([])
  })
})
