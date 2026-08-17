/**
 * @jest-environment node
 */

import { getGeneInfoByName } from '../ncbi-gene'
import { metricsToSourceStatus, runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { sourceStatusForPanel } from '@/lib/panelApiTrace'

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

describe('getGeneInfoByName', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getGeneInfoByName('')).resolves.toEqual([])
    await expect(getGeneInfoByName('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps NCBI Gene esearch + esummary', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['1636'] } }))
      .mockResolvedValueOnce(jsonRes({
        result: {
          '1636': {
            Name: 'ACE',
            Description: 'angiotensin I converting enzyme',
            Summary: 'converts angiotensin I',
            Chromosome: '17',
            Organism: { ScientificName: 'Homo sapiens' },
          },
        },
      }))
    const rows = await getGeneInfoByName('ACE')
    expect(rows).toHaveLength(1)
    expect(rows[0].geneId).toBe('1636')
    expect(rows[0].symbol).toBe('ACE')
    expect(rows[0].url).toContain('1636')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('eutils.ncbi.nlm.nih.gov')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    expect(await getGeneInfoByName('unknownxyzncbi')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getGeneInfoByName('ACE')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on summary HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['1636'] } }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGeneInfoByName('ACE')).rejects.toThrow(/network/)
  })
})

describe('NCBI Gene trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ncbi-gene', getGeneInfoByName('ACE'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ncbi-gene')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'gene-info')?.status).toBe('error')
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'gene-overview')?.status).toBe('error')
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ncbi-gene', getGeneInfoByName('ACE'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'ncbi-gene')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'gene-info')?.status).not.toBe('error')
    expect(sourceStatusForPanel(metricsToSourceStatus(metrics), 'gene-overview')?.status).not.toBe('error')
  })
})
