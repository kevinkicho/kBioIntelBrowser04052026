import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'

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

describe('getChemblMechanismsByName', () => {
  test('returns parsed mechanisms on success', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(
        jsonRes({
          molecules: [{ molecule_chembl_id: 'CHEMBL25' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          mechanisms: [
            {
              mechanism_of_action: 'Cyclooxygenase inhibitor',
              action_type: 'INHIBITOR',
              target_chembl_id: 'CHEMBL2094253',
              max_phase: 4,
              direct_interaction: true,
            },
          ],
        }),
      )

    const results = await getChemblMechanismsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].mechanismOfAction).toBe('Cyclooxygenase inhibitor')
    expect(results[0].actionType).toBe('INHIBITOR')
    expect(results[0].targetChemblId).toBe('CHEMBL2094253')
    expect(results[0].maxPhase).toBe(4)
    expect(results[0].directInteraction).toBe(true)
  })

  test('true empty molecule search JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ molecules: [] }))
    expect(await getChemblMechanismsByName('unknownxyz')).toEqual([])
  })

  test('true empty mechanism JSON is [] (not error)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ molecules: [{ molecule_chembl_id: 'CHEMBL25' }] }))
      .mockResolvedValueOnce(jsonRes({ mechanisms: [] }))
    expect(await getChemblMechanismsByName('aspirin')).toEqual([])
  })

  test('throws when molecule search HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemblMechanismsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws when mechanism fetch HTTP-fail (not EMPTY)', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce(jsonRes({ molecules: [{ molecule_chembl_id: 'CHEMBL25' }] }))
      .mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemblMechanismsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    await expect(getChemblMechanismsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('throws on HTML (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes('<html></html>', 200, 'text/html'))
    await expect(getChemblMechanismsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  test('blank query is empty without fetch', async () => {
    expect(await getChemblMechanismsByName('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
