/**
 * @jest-environment node
 */

import { getNsfAwardsByKeyword } from '../nsfAwards'
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

describe('getNsfAwardsByKeyword', () => {
  it('returns empty for short query without network', async () => {
    await expect(getNsfAwardsByKeyword('a')).resolves.toEqual([])
    await expect(getNsfAwardsByKeyword('')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps NSF awards search response', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        response: {
          award: [
            {
              id: '1234567',
              title: 'Amyloidosis Biomarker Methods',
              piFirstName: 'Ada',
              piLastName: 'Lovelace',
              awardeeName: 'Example University',
              estimatedTotalAmt: '250000',
              startDate: '01/01/2020',
              expDate: '12/31/2023',
              abstractText: 'Study of protein folding markers related to ATTR.',
            },
          ],
        },
      }),
    )
    const rows = await getNsfAwardsByKeyword('amyloidosis', 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('1234567')
    expect(rows[0].piName).toBe('Ada Lovelace')
    expect(rows[0].organization).toBe('Example University')
    expect(rows[0].amount).toBe(250000)
    expect(rows[0].awardUrl).toContain('AWD_ID=1234567')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('api.nsf.gov')
  })

  it('handles single award object (not array)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        response: {
          award: {
            id: '99',
            title: 'Solo award',
            piFirstName: 'Grace',
            piLastName: 'Hopper',
            awardeeName: 'Navy Lab',
            estimatedTotalAmt: 1000,
          },
        },
      }),
    )
    const rows = await getNsfAwardsByKeyword('computing')
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Solo award')
  })

  it('zero-hit JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ response: {} }))
    expect(await getNsfAwardsByKeyword('unknownxyzaward')).toEqual([])
  })

  it('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getNsfAwardsByKeyword('amyloidosis')).toEqual([])
  })

  it('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getNsfAwardsByKeyword('amyloidosis')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getNsfAwardsByKeyword('amyloidosis')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getNsfAwardsByKeyword('amyloidosis')).rejects.toThrow(/network/)
  })
})

describe('NSF Awards trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('nsf-awards', getNsfAwardsByKeyword('amyloidosis'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'nsf-awards')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('nsf-awards', getNsfAwardsByKeyword('amyloidosis'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'nsf-awards')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
