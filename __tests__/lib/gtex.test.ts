import { getGTExEQTL, getGTExGeneExpression, getGTExTopTissues } from '@/lib/api/gtex'
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

describe('getGTExGeneExpression', () => {
  test('maps v2 expression rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: {
          geneInfo: { symbol: 'TP53', biotype: 'protein_coding', description: 'tumor protein p53' },
          geneExpression: [
            { tissueName: 'Liver', tissueSiteDetailId: 'Liver', tpm: 12.5, tpmSd: 1, nSamples: 10, rank: 1, percentile: 99 },
            { tissueName: 'Lung', tissueSiteDetailId: 'Lung', tpm: 3.2, tpmSd: 0.4, nSamples: 8, rank: 2, percentile: 80 },
          ],
        },
      }),
    )
    const result = await getGTExGeneExpression('ENSG00000141510')
    expect(result?.geneSymbol).toBe('TP53')
    expect(result?.expressions).toHaveLength(2)
    expect(result?.expressions[0].tpm).toBe(12.5)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('v2 404 + v1 404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 404))
      .mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGTExGeneExpression('ENSG00000141510')).toBeNull()
  })

  test('true empty JSON is empty expressions (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: { geneInfo: { symbol: 'TP53' }, geneExpression: [] } }))
    const result = await getGTExGeneExpression('ENSG00000141510')
    expect(result?.expressions).toEqual([])
  })

  test('v2 503 + v1 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGTExGeneExpression('ENSG00000141510')).rejects.toThrow(/HTTP 503/)
  })

  test('v2 503 + v1 404 throws primary (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 404))
    await expect(getGTExGeneExpression('ENSG00000141510')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getGTExGeneExpression('ENSG00000141510')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGTExGeneExpression('ENSG00000141510')).rejects.toThrow(/network/)
  })

  test('symbol resolve 503 throws (not missing-gene EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGTExGeneExpression('TP53')).rejects.toThrow(/HTTP 503/)
  })

  test('symbol resolve 404 is missing gene (EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGTExGeneExpression('NOTAGENE')).toBeNull()
  })
})

describe('getGTExTopTissues', () => {
  test('returns top tissues by TPM', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: {
          geneInfo: { symbol: 'TP53' },
          geneExpression: [
            { tissueName: 'Lung', tissueSiteDetailId: 'Lung', tpm: 3 },
            { tissueName: 'Liver', tissueSiteDetailId: 'Liver', tpm: 12 },
          ],
        },
      }),
    )
    const rows = await getGTExTopTissues('ENSG00000141510', 1)
    expect(rows).toHaveLength(1)
    expect(rows[0].tissueName).toBe('Liver')
  })

  test('propagates HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGTExTopTissues('ENSG00000141510')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getGTExEQTL', () => {
  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGTExEQTL('ENSG00000141510', 'Liver')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGTExEQTL('ENSG00000141510', 'Liver')).rejects.toThrow(/HTTP 503/)
  })
})

describe('GTEx trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gtex', getGTExTopTissues('ENSG00000141510'), []),
    )
    expect(value).toEqual([])
    const gtex = metrics.find((m) => m.source === 'gtex')
    expect(gtex?.loadStatus).toBe('error')
    expect(gtex?.error).toMatch(/HTTP 503/)
    expect(gtex?.has_data).toBe(false)
  })

  test('true missing gene is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('gtex', getGTExTopTissues('NOTAGENE'), []),
    )
    expect(value).toEqual([])
    const gtex = metrics.find((m) => m.source === 'gtex')
    expect(gtex?.loadStatus).not.toBe('error')
    expect(gtex?.loadStatus).not.toBe('timeout')
    expect(gtex?.error).toBeUndefined()
  })
})
