/**
 * @jest-environment node
 */

import { getProteinAtlasData } from '../human-protein-atlas'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const searchHit = {
  results: [{ gene: 'TP53', name: 'TP53', ensembl_id: 'ENSG00000141510', description: 'tumor protein p53' }],
}
const tissueRows = [
  { tissue: 'liver', tissue_type: 'organ', expression_level: 'High', score: 3, n_rna: 10, n_protein: 8 },
]
const cellRows = [{ cell_line: 'HeLa', expression_level: 'Medium', score: 2 }]
const locRows = [{ location: 'Nucleus', confidence: 'Approved' }]

describe('getProteinAtlasData', () => {
  test('returns parsed expression on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes(searchHit))
      .mockResolvedValueOnce(jsonRes(tissueRows))
      .mockResolvedValueOnce(jsonRes(cellRows))
      .mockResolvedValueOnce(jsonRes(locRows))
    const data = await getProteinAtlasData('TP53')
    expect(data).not.toBeNull()
    expect(data!.gene).toBe('TP53')
    expect(data!.ensemblId).toBe('ENSG00000141510')
    expect(data!.tissueExpression).toHaveLength(1)
    expect(data!.tissueExpression[0].tissue).toBe('liver')
    expect(data!.cellLineExpression?.[0].cellLine).toBe('HeLa')
    expect(data!.subcellularLocalization?.[0].location).toBe('Nucleus')
  })

  test('blank symbol is empty without network', async () => {
    expect(await getProteinAtlasData('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('404 search is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getProteinAtlasData('NOPE')).toBeNull()
  })

  test('zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getProteinAtlasData('unknownxyz')).toBeNull()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getProteinAtlasData('TP53')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getProteinAtlasData('TP53')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getProteinAtlasData('TP53')).rejects.toThrow(/network/)
  })

  test('detail 503 after a live search is ERROR, not EMPTY', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes(searchHit))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getProteinAtlasData('TP53')).rejects.toThrow(/HTTP 503/)
  })

  test('trackedSafe records HTTP 503 as error, not empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { metrics } = await runWithApiMetrics(async () => {
      await trackedSafe('human-protein-atlas', getProteinAtlasData('TP53'), null)
    })
    expect(metrics[0].loadStatus).toBe('error')
    expect(metrics[0].has_data).toBe(false)
    expect(metrics[0].error).toMatch(/HTTP 503/)
  })
})
