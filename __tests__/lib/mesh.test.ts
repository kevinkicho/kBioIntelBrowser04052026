import { getMeshTermsByName } from '@/lib/api/mesh'
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

describe('getMeshTermsByName', () => {
  test('returns parsed MeSH terms on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          esearchresult: { idlist: ['D001241'] },
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            uids: ['D001241'],
            D001241: {
              ds_meshterms: ['Aspirin'],
              ds_scopenote: 'A non-steroidal anti-inflammatory agent.',
            },
          },
        }),
      )
    const results = await getMeshTermsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].meshId).toBe('D001241')
    expect(results[0].name).toBe('Aspirin')
    expect(results[0].scopeNote).toBe('A non-steroidal anti-inflammatory agent.')
    expect(results[0].treeNumbers).toEqual([])
    expect(results[0].url).toBe('https://meshb.nlm.nih.gov/record/ui?ui=D001241')
  })

  test('true empty JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        esearchresult: { idlist: [] },
      }),
    )
    expect(await getMeshTermsByName('unknownxyz')).toEqual([])
  })

  test('blank name is empty without fetch', async () => {
    expect(await getMeshTermsByName('  ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when search HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMeshTermsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when summary HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          esearchresult: { idlist: ['D001241'] },
        }),
      )
      .mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getMeshTermsByName('aspirin')).rejects.toThrow(/HTTP 502/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getMeshTermsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getMeshTermsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('falls back to uid for name when ds_meshterms is empty', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          esearchresult: { idlist: ['D999999'] },
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            uids: ['D999999'],
            D999999: {
              ds_meshterms: [],
              ds_scopenote: '',
            },
          },
        }),
      )
    const results = await getMeshTermsByName('test')
    expect(results[0].name).toBe('D999999')
  })
})

describe('MeSH trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('mesh', getMeshTermsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const mesh = metrics.find((m) => m.source === 'mesh')
    expect(mesh?.loadStatus).toBe('error')
    expect(mesh?.error).toMatch(/HTTP 503/)
    expect(mesh?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('mesh', getMeshTermsByName('unknownxyz'), []),
    )
    expect(value).toEqual([])
    const mesh = metrics.find((m) => m.source === 'mesh')
    expect(mesh?.loadStatus).not.toBe('error')
    expect(mesh?.loadStatus).not.toBe('timeout')
    expect(mesh?.error).toBeUndefined()
  })
})