import { getKeggCompoundId, getKeggReactions, getKEGGData } from '@/lib/api/kegg'

function textRes(body: string, status = 200, contentType = 'text/plain') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
    json: async () => body,
  }
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getKeggCompoundId', () => {
  test('returns KEGG compound ID for a known molecule name', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(
      textRes('cpd:C00031\tD-Glucose; Grape sugar; Dextrose\ncpd:C00221\tbeta-D-Glucose\n'),
    )
    const id = await getKeggCompoundId('glucose')
    expect(id).toBe('C00031')
  })

  test('true empty text is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes(''))
    expect(await getKeggCompoundId('xyzunknown')).toBeNull()
  })

  test('blank name is null without fetch', async () => {
    expect(await getKeggCompoundId('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes('', 503))
    await expect(getKeggCompoundId('glucose')).rejects.toThrow(/HTTP 503/)
  })
})

describe('getKeggReactions', () => {
  test('returns reaction list for a known compound', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes('rn:R00010\tR00010\nrn:R00014\tR00014\n'))
    const reactions = await getKeggReactions('C00031')
    expect(reactions).toContain('R00010')
    expect(reactions).toContain('R00014')
  })

  test('true empty text is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes(''))
    expect(await getKeggReactions('C99999')).toEqual([])
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes('', 502))
    await expect(getKeggReactions('C00031')).rejects.toThrow(/HTTP 502/)
  })
})

describe('getKEGGData', () => {
  test('returns parsed pathways/compounds/drugs on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(textRes('path:map00010\tGlycolysis / Gluconeogenesis\n'))
      .mockResolvedValueOnce(textRes('cpd:C00031\tD-Glucose\n'))
      .mockResolvedValueOnce(textRes('dr:D00095\tAspirin\n'))
    const res = await getKEGGData('glucose')
    expect(res.pathways[0].id).toBe('map00010')
    expect(res.compounds[0].id).toBe('cpd:C00031')
    expect(res.drugs[0].id).toBe('dr:D00095')
  })

  test('true empty text is empty shell (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(textRes(''))
    expect(await getKEGGData('unknownxyz')).toEqual({ pathways: [], compounds: [], drugs: [] })
  })

  test('blank query is empty without fetch', async () => {
    expect(await getKEGGData('  ')).toEqual({ pathways: [], compounds: [], drugs: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(textRes('', 503))
    await expect(getKEGGData('glucose')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getKEGGData('glucose')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(textRes('<html></html>', 200, 'text/html'))
    await expect(getKEGGData('glucose')).rejects.toThrow(/HTML/)
  })
})
