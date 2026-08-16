import { getProteinDomains } from '@/lib/api/interpro'
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

describe('getProteinDomains', () => {
  test('returns parsed domains on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        results: [
          { metadata: { accession: 'IPR001548', name: 'Peptidase M2', type: 'Family' } },
          { metadata: { accession: 'IPR034184', name: 'ACE domain', type: 'Domain' } },
        ],
      }),
    )
    const results = await getProteinDomains(['P12821'])
    expect(results).toHaveLength(2)
    expect(results[0].domainId).toBe('IPR001548')
    expect(results[0].name).toBe('Peptidase M2')
    expect(results[0].type).toBe('Family')
    expect(results[0].description).toBe('Peptidase M2')
    expect(results[0].url).toBe('https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001548')
    expect(results[1].domainId).toBe('IPR034184')
  })

  test('limits to first 5 accessions', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ results: [] }))
    await getProteinDomains(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'])
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  test('returns empty array when accessions list is empty', async () => {
    expect(await getProteinDomains([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  test('true empty JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getProteinDomains(['P12821'])).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getProteinDomains(['P12821'])).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getProteinDomains(['P12821'])).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getProteinDomains(['P12821'])).rejects.toThrow(/HTML/)
  })

  test('flattens results from multiple accessions', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({ results: [{ metadata: { accession: 'IPR001', name: 'A', type: 'Family' } }] }),
      )
      .mockResolvedValueOnce(
        jsonRes({ results: [{ metadata: { accession: 'IPR002', name: 'B', type: 'Domain' } }] }),
      )
    const results = await getProteinDomains(['P1', 'P2'])
    expect(results).toHaveLength(2)
    expect(results[0].domainId).toBe('IPR001')
    expect(results[1].domainId).toBe('IPR002')
  })
})

describe('InterPro trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('interpro', getProteinDomains(['P12821']), []),
    )
    expect(value).toEqual([])
    const ip = metrics.find((m) => m.source === 'interpro')
    expect(ip?.loadStatus).toBe('error')
    expect(ip?.error).toMatch(/HTTP 503/)
    expect(ip?.has_data).toBe(false)
  })

  test('true zero-hit JSON is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('interpro', getProteinDomains(['P12821']), []),
    )
    expect(value).toEqual([])
    const ip = metrics.find((m) => m.source === 'interpro')
    expect(ip?.loadStatus).not.toBe('error')
    expect(ip?.loadStatus).not.toBe('timeout')
    expect(ip?.error).toBeUndefined()
  })
})
