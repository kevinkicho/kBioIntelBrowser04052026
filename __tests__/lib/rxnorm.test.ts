import { getRxcuiByName, getDrugInteractionsByName } from '@/lib/api/rxnorm'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const warfarinPair = {
  interactionTypeGroup: [{
    sourceName: 'DrugBank',
    interactionType: [{
      interactionPair: [{
        interactionConcept: [
          { minConceptItem: { name: 'metformin', rxcui: '6809' } },
          { minConceptItem: { name: 'warfarin', rxcui: '11289' } },
        ],
        description: 'Metformin may increase the anticoagulant effect of warfarin.',
        severity: 'moderate',
      }],
    }],
  }],
}

global.fetch = jest.fn()
beforeEach(() => jest.resetAllMocks())

describe('getRxcuiByName', () => {
  test('returns RxCUI on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ idGroup: { rxnormId: ['6809'] } }))
    const id = await getRxcuiByName('metformin')
    expect(id).toBe('6809')
  })

  test('true empty JSON is null (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ idGroup: {} }))
    const id = await getRxcuiByName('unknownxyz')
    expect(id).toBeNull()
  })

  test('blank name is null without fetch', async () => {
    expect(await getRxcuiByName('  ')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws when HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getRxcuiByName('metformin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getRxcuiByName('metformin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getRxcuiByName('metformin')).rejects.toThrow(/HTML/)
  })
})

describe('getDrugInteractionsByName', () => {
  test('returns parsed interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ idGroup: { rxnormId: ['6809'] } }))
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes(warfarinPair))
    const results = await getDrugInteractionsByName('metformin')
    expect(results).toHaveLength(1)
    expect(results[0].drugName).toBe('warfarin')
    expect(results[0].severity).toBe('moderate')
    expect(results[0].description).toBe('Metformin may increase the anticoagulant effect of warfarin.')
    expect(results[0].sourceName).toBe('DrugBank')
  })

  test('true empty RxCUI is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({ idGroup: {} }))
    const results = await getDrugInteractionsByName('unknownxyz')
    expect(results).toEqual([])
  })

  test('true empty pair + empty openFDA is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('rxcui.json')) return jsonRes({ idGroup: { rxnormId: ['6809'] } })
      if (u.includes('interaction/list')) return jsonRes({})
      if (u.includes('api.fda.gov')) return jsonRes({ results: [] })
      return jsonRes({})
    })
    const results = await getDrugInteractionsByName('metformin')
    expect(results).toEqual([])
  })

  test('pair-list 404 continues; 503 throws (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (url: string) => {
      const u = String(url)
      if (u.includes('rxcui.json')) return jsonRes({ idGroup: { rxnormId: ['6809'] } })
      if (u.includes('interaction/list')) return jsonRes({}, 404)
      return jsonRes({}, 503)
    })
    await expect(getDrugInteractionsByName('metformin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when RxCUI lookup HTTP-fails (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 502))
    await expect(getDrugInteractionsByName('metformin')).rejects.toThrow(/HTTP 502/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getDrugInteractionsByName('metformin')).rejects.toThrow(/network/)
  })
})
