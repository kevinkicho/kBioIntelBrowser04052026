import { getChemicalInteractionsByName } from '@/lib/api/stitch'
import { getDrugGeneInteractionsByName } from '@/lib/api/dgidb'
import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

jest.mock('@/lib/api/dgidb', () => ({
  getDrugGeneInteractionsByName: jest.fn(),
}))

jest.mock('@/lib/api/chembl', () => ({
  getChemblActivitiesByName: jest.fn(),
}))

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
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
  ;(getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([])
  ;(getChemblActivitiesByName as jest.Mock).mockResolvedValue([])
})

describe('getChemicalInteractionsByName', () => {
  test('returns parsed chemical-protein interactions on success', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([
      {
        stringId_A: 'CIDm002244',
        stringId_B: '9606.ENSP00000290421',
        preferredName_A: 'aspirin',
        preferredName_B: 'PTGS2',
        score: '0.95',
        escore: '0.7',
        dscore: '0.8',
        tscore: '0.6',
      },
    ]))
    const results = await getChemicalInteractionsByName('aspirin')
    expect(results).toHaveLength(1)
    expect(results[0].chemicalName).toBe('aspirin')
    expect(results[0].proteinName).toBe('PTGS2')
    expect(results[0].combinedScore).toBe(0.95)
    expect(results[0].experimentalScore).toBe(0.7)
    expect(results[0].databaseScore).toBe(0.8)
    expect(results[0].textminingScore).toBe(0.6)
    expect(results[0].url).toContain('string-db.org/network/')
  })

  test('uses Number() coercion and falls back to 0 for scores', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([
      {
        stringId_A: 'CIDm002244',
        preferredName_A: 'aspirin',
        preferredName_B: 'ACE',
        score: null,
        escore: null,
        dscore: null,
        tscore: null,
      },
    ]))
    const results = await getChemicalInteractionsByName('aspirin')
    expect(results[0].combinedScore).toBe(0)
    expect(results[0].experimentalScore).toBe(0)
  })

  test('includes species=9606 in the request URL', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([]))
    await getChemicalInteractionsByName('aspirin')
    const calledUrl = (fetch as jest.Mock).mock.calls[0][0] as string
    expect(calledUrl).toContain('species=9606')
    expect(calledUrl).toContain('limit=10')
  })

  test('throws when STRING, DGIdb, and ChEMBL all fail HTTP', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    await expect(getChemicalInteractionsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  test('throws on network error when all sources fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getChemicalInteractionsByName('aspirin')).rejects.toThrow(/network/)
  })

  test('returns empty array when API returns empty list', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([]))
    expect(await getChemicalInteractionsByName('unknownxyz')).toEqual([])
  })
})