import {
  getGeneExpressionBySymbols,
  mapBaselineExperimentsToRows,
  hasAtlasExpressionLevel,
} from '@/lib/api/expression-atlas'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'

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
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
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
    )
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results.length).toBe(2)
    expect(results[0].expressionLevel).toBe(3.1)
    expect(results[0].tissueName).toBe('breast')
    expect(hasAtlasExpressionLevel(results[0])).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('falls back to experiments catalog without inventing levels', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ columnHeaders: [], profiles: { rows: [] } }))
      .mockResolvedValueOnce(
        jsonRes({
          experiments: [
            {
              experimentAccession: 'E-MTAB-123',
              experimentDescription: 'Baseline expression in tissues',
              species: 'Homo sapiens',
              experimentType: 'RNASEQ_MRNA_BASELINE',
            },
          ],
        }),
      )
    const results = await getGeneExpressionBySymbols(['ACE'])
    expect(results).toHaveLength(1)
    expect(results[0].experimentDescription).toBe('Baseline expression in tissues')
    expect(results[0].species).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123')
    expect(hasAtlasExpressionLevel(results[0])).toBe(false)
  })

  test('deduplicates experiments across symbols', async () => {
    const emptyBaseline = jsonRes({ columnHeaders: [], profiles: { rows: [] } })
    const catalog = jsonRes({
      experiments: [
        {
          experimentAccession: 'E-MTAB-123',
          experimentDescription: 'Shared experiment',
          species: 'Homo sapiens',
          experimentType: 'RNASEQ_MRNA_BASELINE',
        },
      ],
    })
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
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes({ columnHeaders: [], profiles: { rows: [] }, experiments: [] }),
    )
    await getGeneExpressionBySymbols(symbols)
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  test('returns empty array for empty symbols', async () => {
    expect(await getGeneExpressionBySymbols([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 + catalog zero-hit is honest EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({ experiments: [] }))
    expect(await getGeneExpressionBySymbols(['ACE'])).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('true empty JSON + catalog empty is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ columnHeaders: [], profiles: { rows: [] } }))
      .mockResolvedValueOnce(jsonRes({ experiments: [] }))
    expect(await getGeneExpressionBySymbols(['zzz'])).toEqual([])
  })

  test('baseline 503 + catalog 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneExpressionBySymbols(['ACE'])).rejects.toThrow(/HTTP 503/)
  })

  test('baseline 503 + catalog 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getGeneExpressionBySymbols(['ACE'])).rejects.toThrow(/HTTP 503/)
  })

  test('baseline 503 + catalog rows uses fallback', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(
        jsonRes({
          experiments: [
            {
              experimentAccession: 'E-MTAB-9',
              experimentDescription: 'Catalog fallback',
              species: 'Homo sapiens',
              experimentType: 'RNASEQ_MRNA_BASELINE',
            },
          ],
        }),
      )
    const rows = await getGeneExpressionBySymbols(['ACE'])
    expect(rows).toHaveLength(1)
    expect(rows[0].experimentDescription).toBe('Catalog fallback')
  })

  test('throws on HTML body when fallback also fails (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneExpressionBySymbols(['ACE'])).rejects.toThrow(/HTML|HTTP 503/)
  })

  test('throws on network error when fallback also fails', async () => {
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
    await expect(getGeneExpressionBySymbols(['ACE'])).rejects.toThrow(/network/)
  })
})

describe('Expression Atlas trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('expression-atlas', getGeneExpressionBySymbols(['ACE']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'expression-atlas')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('expression-atlas', getGeneExpressionBySymbols(['zzz']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'expression-atlas')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
