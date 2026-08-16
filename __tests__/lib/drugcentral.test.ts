import { getDrugCentralData, getDrugCentralEnhanced } from '@/lib/api/drugcentral'

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

describe('getDrugCentralData', () => {
  test('returns parsed drug and targets on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ results: [{ id: 1, name: 'aspirin' }] }))
      .mockResolvedValueOnce(
        jsonRes({
          name: 'aspirin',
          indications: [{ indication_name: 'pain' }],
          actions: [{ action_type: 'inhibitor' }],
          atc: [{ code: 'N02BA01' }],
          targets: [{ target_name: 'PTGS1', gene: 'PTGS1', accession: 'P23219', action_type: 'inhibitor' }],
          synonyms: [{ synonym: 'ASA' }],
        }),
      )
    const result = await getDrugCentralData('aspirin')
    expect(result.drug?.name).toBe('aspirin')
    expect(result.drug?.indication).toEqual(['pain'])
    expect(result.targets).toHaveLength(1)
    expect(result.targets[0].geneSymbol).toBe('PTGS1')
  })

  test('true empty search JSON is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getDrugCentralData('unknownxyz')).toEqual({ drug: null, targets: [] })
  })

  test('blank name is empty without fetch', async () => {
    expect(await getDrugCentralData('  ')).toEqual({ drug: null, targets: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when search HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugCentralData('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when detail HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ results: [{ id: 1, name: 'aspirin' }] }))
      .mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getDrugCentralData('aspirin')).rejects.toThrow(/HTTP 502/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugCentralData('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getDrugCentralData('aspirin')).rejects.toThrow(/HTML/)
  })
})

describe('getDrugCentralEnhanced', () => {
  test('true miss is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ results: [] }))
    expect(await getDrugCentralEnhanced('unknownxyz')).toBeNull()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getDrugCentralEnhanced('aspirin')).rejects.toThrow(/HTTP 503/)
  })
})