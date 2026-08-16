import { getCellLineSignatures, getGeneExpressionSignature, getLINCSSignaturesByName } from '@/lib/api/lincs'
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

describe('getLINCSSignaturesByName', () => {
  test('maps signature search hits', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            perturbation_id: 'BRD-K123',
            perturbation_name: 'vorinostat',
            perturbation_type: 'small molecule',
            concentration: 10,
            concentration_unit: 'uM',
            time_point: '24h',
            cell_line: 'MCF7',
            cell_line_name: 'MCF7',
            tissue: 'breast',
            up_genes: ['CDKN1A'],
            down_genes: ['MYC'],
            zscore: 2.1,
            pvalue: 0.01,
          },
        ],
      }),
    )
    const rows = await getLINCSSignaturesByName('vorinostat')
    expect(rows).toHaveLength(1)
    expect(rows[0].perturbationId).toBe('BRD-K123')
    expect(rows[0].upregulatedGenes).toEqual(['CDKN1A'])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getLINCSSignaturesByName('zzz')).toEqual([])
  })

  test('signatures 404 + perturbations 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getLINCSSignaturesByName('zzz')).toEqual([])
  })

  test('signatures 503 + perturbations 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getLINCSSignaturesByName('vorinostat')).rejects.toThrow(/HTTP 503/)
  })

  test('signatures 503 + perturbations 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getLINCSSignaturesByName('vorinostat')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getLINCSSignaturesByName('vorinostat')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getLINCSSignaturesByName('vorinostat')).rejects.toThrow(/network/)
  })
})

describe('getGeneExpressionSignature', () => {
  test('404 on gene search is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGeneExpressionSignature('TP53')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneExpressionSignature('TP53')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getCellLineSignatures', () => {
  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getCellLineSignatures('MCF7')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getCellLineSignatures('MCF7')).rejects.toThrow(/HTTP 503/)
  })
})

describe('LINCS trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('lincs', getLINCSSignaturesByName('vorinostat'), []),
    )
    expect(value).toEqual([])
    const lincs = metrics.find((m) => m.source === 'lincs')
    expect(lincs?.loadStatus).toBe('error')
    expect(lincs?.error).toMatch(/HTTP 503/)
    expect(lincs?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('lincs', getLINCSSignaturesByName('zzz'), []),
    )
    expect(value).toEqual([])
    const lincs = metrics.find((m) => m.source === 'lincs')
    expect(lincs?.loadStatus).not.toBe('error')
    expect(lincs?.loadStatus).not.toBe('timeout')
    expect(lincs?.error).toBeUndefined()
  })
})
