import { getGoAnnotationsByAccessions } from '@/lib/api/quickgo'
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

describe('getGoAnnotationsByAccessions', () => {
  test('returns parsed annotations on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          {
            goId: 'GO:0004180',
            goName: 'carboxypeptidase activity',
            goAspect: 'molecular_function',
            goEvidence: 'IDA',
            qualifier: 'enables',
          },
        ],
      }),
    )
    const results = await getGoAnnotationsByAccessions(['P12821'])
    expect(results).toHaveLength(1)
    expect(results[0].goId).toBe('GO:0004180')
    expect(results[0].goName).toBe('carboxypeptidase activity')
    expect(results[0].goAspect).toBe('molecular_function')
    expect(results[0].evidence).toBe('IDA')
    expect(results[0].qualifier).toBe('enables')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/QuickGO/term/GO:0004180')
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getGoAnnotationsByAccessions([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getGoAnnotationsByAccessions(['P12821'])).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getGoAnnotationsByAccessions(['P12821'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getGoAnnotationsByAccessions(['P12821'])).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getGoAnnotationsByAccessions(['P12821'])).rejects.toThrow(/HTML/)
  })

  test('deduplicates annotations by goId across accessions', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          results: [{ goId: 'GO:0001', goAspect: 'molecular_function', goEvidence: 'IDA', qualifier: '' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          results: [{ goId: 'GO:0001', goAspect: 'molecular_function', goEvidence: 'IDA', qualifier: '' }],
        }),
      )
    const results = await getGoAnnotationsByAccessions(['P12821', 'Q9Y5Y4'])
    expect(results).toHaveLength(1)
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(
      jsonRes({ results: [{ goId: 'GO:0001', goAspect: '', goEvidence: '', qualifier: '' }] }),
    )
    await getGoAnnotationsByAccessions(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })
})

describe('QuickGO trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('quickgo', getGoAnnotationsByAccessions(['P12821']), []),
    )
    expect(value).toEqual([])
    const qg = metrics.find((m) => m.source === 'quickgo')
    expect(qg?.loadStatus).toBe('error')
    expect(qg?.error).toMatch(/HTTP 503/)
    expect(qg?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('quickgo', getGoAnnotationsByAccessions(['P12821']), []),
    )
    expect(value).toEqual([])
    const qg = metrics.find((m) => m.source === 'quickgo')
    expect(qg?.loadStatus).not.toBe('error')
    expect(qg?.loadStatus).not.toBe('timeout')
    expect(qg?.error).toBeUndefined()
  })
})
