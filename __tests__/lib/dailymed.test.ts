import { getDrugLabelsByName } from '@/lib/api/dailymed'

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

describe('getDrugLabelsByName', () => {
  test('returns parsed labels on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({
        data: [{
          setid: 'abc-123', title: 'METFORMIN HYDROCHLORIDE tablet',
          published_date: '2024-01-15',
          products: [{ dosage_form: 'TABLET', route: 'ORAL', labeler_name: 'Teva Pharmaceuticals' }],
        }],
      }),
    )
    const labels = await getDrugLabelsByName('metformin')
    expect(labels).toHaveLength(1)
    expect(labels[0].title).toBe('METFORMIN HYDROCHLORIDE tablet')
    expect(labels[0].setId).toBe('abc-123')
    expect(labels[0].publishedDate).toBe('2024-01-15')
    expect(labels[0].dosageForm).toBe('TABLET')
    expect(labels[0].route).toBe('ORAL')
    expect(labels[0].labelerName).toBe('Teva Pharmaceuticals')
    expect(labels[0].dailyMedUrl).toContain('drugInfo.cfm?setid=')
    expect(labels[0].dailyMedUrl).toContain('abc-123')
    expect(labels[0].url).toBe(labels[0].dailyMedUrl)
  })

  test('true empty data JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ data: [] }))
    expect(await getDrugLabelsByName('unknownxyz')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugLabelsByName('metformin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugLabelsByName('metformin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getDrugLabelsByName('metformin')).rejects.toThrow(/HTML/)
  })

  test('handles missing product fields gracefully', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      jsonRes({ data: [{ setid: 'xyz-456', title: 'Some Drug', published_date: '2023-06-01', products: [] }] }),
    )
    const labels = await getDrugLabelsByName('something')
    expect(labels).toHaveLength(1)
    expect(labels[0].dosageForm).toBe('')
    expect(labels[0].route).toBe('')
    expect(labels[0].labelerName).toBe('')
  })
})
