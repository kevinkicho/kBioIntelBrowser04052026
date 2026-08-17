/**
 * @jest-environment node
 */

import { getCitationMetrics } from '../opencitations'
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

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('getCitationMetrics', () => {
  it('returns empty for invalid DOI list without network', async () => {
    expect(await getCitationMetrics([])).toEqual([])
    expect(await getCitationMetrics(['aspirin'])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps OpenCitations fanout rows', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = String(input)
      if (url.includes('citation-count')) return jsonRes([{ count: '42' }])
      if (url.includes('/references/')) return jsonRes([{ cited: 'doi:10.1000/ref1' }])
      if (url.includes('/metadata/')) {
        return jsonRes([{
          id: 'doi:10.1000/test openalex:W1 pmid:123',
          title: 'Example Paper',
          author: 'Doe, Jane [orcid:0000]',
          pub_date: '2020-01-01',
          venue: 'Nature [issn:1]',
          type: 'journal article',
          volume: '1',
          page: '1-2',
        }])
      }
      return jsonRes([{ citing: 'doi:10.1000/cite1' }])
    })
    const rows = await getCitationMetrics(['10.1000/test'])
    expect(rows).toHaveLength(1)
    expect(rows[0].citationCount).toBe(42)
    expect(rows[0].title).toBe('Example Paper')
    expect(rows[0].pmid).toBe('123')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('opencitations.net')
  })

  it('404 on all four endpoints is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getCitationMetrics(['10.1000/test'])).toEqual([])
  })

  it('throws when all four endpoints return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getCitationMetrics(['10.1000/test'])).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body when all endpoints fail', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getCitationMetrics(['10.1000/test'])).rejects.toThrow(/HTML/)
  })

  it('throws on network error when all endpoints fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getCitationMetrics(['10.1000/test'])).rejects.toThrow(/network/)
  })

  it('count 503 still uses meta title from same source', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = String(input)
      if (url.includes('citation-count')) return jsonRes({}, 503)
      if (url.includes('/metadata/')) return jsonRes([{ title: 'Partial', pub_date: '2021-01-01' }])
      return jsonRes({}, 404)
    })
    const rows = await getCitationMetrics(['10.1000/test'])
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Partial')
    expect(rows[0].citationCount).toBe(0)
  })
})

describe('OpenCitations trackedSafe honesty', () => {
  test('all-fail HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('opencitations', getCitationMetrics(['10.1000/test']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'opencitations')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('opencitations', getCitationMetrics(['10.1000/test']), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'opencitations')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
