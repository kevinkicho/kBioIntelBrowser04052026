/**
 * @jest-environment node
 */

import { getGeneExpression, getBgeeData } from '../bgee'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function binding(anatName: string, score = '10') {
  return {
    gene: { value: 'http://bgee.org/gene/BRCA1' },
    geneName: { value: 'BRCA1' },
    anatEntity: { value: 'http://purl.obolibrary.org/obo/UBERON_0000955' },
    anatName: { value: anatName },
    score: { value: score },
  }
}

function sparql(bindings: Record<string, unknown>[]) {
  return jsonRes({ results: { bindings } })
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('getGeneExpression', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getGeneExpression('')).resolves.toEqual([])
    await expect(getGeneExpression('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps SPARQL expression bindings', async () => {
    const tissues = ['brain', 'liver', 'heart', 'lung', 'kidney', 'skin', 'blood', 'bone']
    ;(fetch as jest.Mock).mockResolvedValueOnce(sparql(tissues.map((name, i) => binding(name, String(90 - i)))))
    const rows = await getGeneExpression('BRCA1')
    expect(rows.length).toBeGreaterThanOrEqual(8)
    expect(rows[0].geneSymbol).toBe('BRCA1')
    expect(rows[0].anatomicalEntityName).toBe('brain')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('bgee.org')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(sparql([]))
    expect(await getGeneExpression('unknownxyzbgee')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getGeneExpression('BRCA1')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getGeneExpression('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getGeneExpression('BRCA1')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getGeneExpression('BRCA1')).rejects.toThrow(/network/)
  })

  it('POST 503 still uses GET fallback; GET 503 throws', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneExpression('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  it('POST 503 then GET zero-hit is empty (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({}, 503))
      .mockResolvedValue(sparql([]))
    expect(await getGeneExpression('unknownxyzbgee')).toEqual([])
  })
})

describe('getBgeeData', () => {
  it('throws on HTTP 503 (not empty shell)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getBgeeData('BRCA1')).rejects.toThrow(/HTTP 503/)
  })

  it('true empty stays empty shell', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(sparql([]))
    expect(await getBgeeData('unknownxyzbgee')).toEqual({ expressions: [] })
  })
})

describe('Bgee trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('bgee', getGeneExpression('BRCA1'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'bgee')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('bgee', getGeneExpression('BRCA1'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'bgee')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
