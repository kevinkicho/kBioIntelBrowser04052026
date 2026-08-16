import { getMedGenConcepts, getMedGenByCui } from '@/lib/api/medgen'
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

describe('getMedGenConcepts', () => {
  test('returns parsed concepts on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['10911'] } }))
      .mockResolvedValueOnce(
        jsonRes({
          result: {
            '10911': {
              name: 'Aspirin-induced asthma',
              cui: 'C0004096',
              definition: 'Asthma precipitated by aspirin',
              semantictypes: ['Disease or Syndrome'],
              synonyms: ['AIA'],
              umls_cui: 'C0004096',
              omim_ids: [],
            },
          },
        }),
      )
    const results = await getMedGenConcepts('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].conceptId).toBe('10911')
    expect(results[0].name).toBe('Aspirin-induced asthma')
    expect(results[0].cui).toBe('C0004096')
    expect(results[0].url).toBe('https://www.ncbi.nlm.nih.gov/medgen/10911')
  })

  test('empty query is empty (not fetched)', async () => {
    expect(await getMedGenConcepts('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('zero-hit idlist is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: [] } }))
    expect(await getMedGenConcepts('unknownxyz')).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('404 is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getMedGenConcepts('unknownxyz')).toEqual([])
  })

  test('throws on search HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMedGenConcepts('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on summary HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ esearchresult: { idlist: ['10911'] } }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMedGenConcepts('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(getMedGenConcepts('aspirin')).rejects.toThrow(/HTML/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getMedGenConcepts('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getMedGenByCui', () => {
  test('missing CUI is empty (not fetched)', async () => {
    expect(await getMedGenByCui('')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws on HTTP 503 (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getMedGenByCui('C0004096')).rejects.toThrow(/HTTP 503/)
  })
})

describe('MedGen trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('medgen', getMedGenConcepts('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'medgen')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('medgen', getMedGenConcepts('zzz'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'medgen')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
