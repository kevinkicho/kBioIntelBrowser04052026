import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
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

describe('getRheaSynthesisRoutes', () => {
  test('returns mapped routes on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            rheaId: 'RHEA:12345',
            equation: 'A + B = C + D',
            enzymes: [{ name: 'kinase' }],
          },
        ],
      }),
    )
    const rows = await getRheaSynthesisRoutes('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].method).toContain('RHEA:12345')
    expect(rows[0].description).toBe('A + B = C + D')
    expect(rows[0].enzymesInvolved).toEqual(['kinase'])
    expect(rows[0].source).toBe('rhea')
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getRheaSynthesisRoutes('zzz')).toEqual([])
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getRheaSynthesisRoutes('zzz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getRheaSynthesisRoutes('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getRheaSynthesisRoutes('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getRheaSynthesisRoutes('aspirin')).rejects.toThrow(/network/)
  })
})

describe('Rhea trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('rhea', getRheaSynthesisRoutes('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'rhea')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('rhea', getRheaSynthesisRoutes('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'rhea')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
