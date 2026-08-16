/**
 * @jest-environment node
 */

import { searchClinGenByGene, getClinGenData } from '../clingen'
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

describe('searchClinGenByGene', () => {
  it('returns empty for short query without network', async () => {
    await expect(searchClinGenByGene('a')).resolves.toEqual([])
    await expect(searchClinGenByGene('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps ClinGen gene-disease JSON', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            id: 'gd-1',
            disease_name: 'hereditary breast cancer',
            mondo_id: 'MONDO:0007254',
            validity_classification: 'Definitive',
            validity_score: 12,
            mode_of_inheritance: 'AD',
            assertion_date: '2020-01-01',
            expert_panel: 'Hereditary Cancer',
          },
        ],
      }),
    )
    const rows = await searchClinGenByGene('BRCA1', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].geneSymbol).toBe('BRCA1')
    expect(rows[0].diseaseName).toBe('hereditary breast cancer')
    expect(rows[0].validityClassification).toBe('Definitive')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('clinicalgenome.org')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await searchClinGenByGene('UNKNOWNXYZ')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchClinGenByGene('BRCA1')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchClinGenByGene('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchClinGenByGene('BRCA1')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchClinGenByGene('BRCA1')).rejects.toThrow(/network/)
  })
})

describe('getClinGenData', () => {
  it('propagates HTTP 503 so Discover cannot treat failure as empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getClinGenData('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  it('true empty shells stay empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ results: [] }))
    await expect(getClinGenData('UNKNOWNXYZ')).resolves.toEqual({
      geneDiseases: [],
      variants: [],
    })
  })
})

describe('ClinGen trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('clingen', searchClinGenByGene('BRCA1'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'clingen')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('clingen', searchClinGenByGene('BRCA1'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'clingen')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})