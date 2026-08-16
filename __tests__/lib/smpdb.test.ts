import { searchSMPDB, getSMPDBPathway } from '@/lib/api/smpdb'
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

describe('searchSMPDB', () => {
  test('returns parsed pathways on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            typeName: 'Pathway',
            entries: [
              {
                stId: 'R-HSA-2162123',
                name: 'Synthesis of Prostaglandins (PG)',
                species: 'Homo sapiens',
                summation: 'Prostaglandins are synthesized from arachidonic acid.',
              },
            ],
          },
        ],
      }),
    )
    const results = await searchSMPDB('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].smpdbId).toBe('R-HSA-2162123')
    expect(results[0].name).toBe('Synthesis of Prostaglandins (PG)')
    expect(results[0].organism).toBe('Homo sapiens')
    expect(results[0].url).toBe('https://reactome.org/content/detail/R-HSA-2162123')
  })

  test('true empty (no Pathway group) is empty', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [{ typeName: 'Protein', entries: [{ stId: 'R-HSA-1', name: 'Some protein' }] }],
      }),
    )
    expect(await searchSMPDB('aspirin')).toEqual([])
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await searchSMPDB('unknownxyz')).toEqual([])
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(searchSMPDB('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchSMPDB('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(searchSMPDB('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getSMPDBPathway', () => {
  test('404 missing id is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getSMPDBPathway('missing')).toBeNull()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getSMPDBPathway('R-HSA-1')).rejects.toThrow(/HTTP 503/)
  })
})

describe('SMPDB trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('smpdb', searchSMPDB('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'smpdb')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('smpdb', searchSMPDB('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'smpdb')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
