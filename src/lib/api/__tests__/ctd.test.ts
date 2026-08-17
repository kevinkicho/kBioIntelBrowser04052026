/**
 * @jest-environment node
 */

import { getCTDData, getChemicalGeneInteractions } from '../ctd'
import { getDrugGeneInteractionsByName } from '../dgidb'
import { getDiseaseAssociationsByName } from '../opentargets'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

jest.mock('../dgidb', () => ({
  getDrugGeneInteractionsByName: jest.fn(),
}))

jest.mock('../opentargets', () => ({
  getDiseaseAssociationsByName: jest.fn(),
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

const ctdRow = ['Aspirin', 'D001241', 'PTGS2', '5743', 'decreases', 'inhibitor', '123']

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
  ;(getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([])
  ;(getDiseaseAssociationsByName as jest.Mock).mockResolvedValue([])
})

describe('getCTDData', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getCTDData('')).resolves.toEqual({ interactions: [], diseaseAssociations: [] })
    await expect(getCTDData('   ')).resolves.toEqual({ interactions: [], diseaseAssociations: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps CTD chemical-gene rows', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = String(input)
      if (url.includes('_gene_interaction')) return jsonRes({ data: [ctdRow] })
      return jsonRes({ data: [] })
    })
    const data = await getCTDData('aspirin')
    expect(data.interactions).toHaveLength(1)
    expect(data.interactions[0].geneSymbol).toBe('PTGS2')
    expect(data.interactions[0].source).toBe('CTD')
    expect(getDrugGeneInteractionsByName).not.toHaveBeenCalled()
  })

  it('404 on CTD plus empty fallbacks is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getCTDData('aspirin')).toEqual({ interactions: [], diseaseAssociations: [] })
  })

  it('CTD 404 still uses DGIdb fallback rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([
      { geneSymbol: 'PTGS2', geneName: 'PTGS2', interactionType: 'inhibitor', drugName: 'aspirin', score: 0.9, url: '' },
    ])
    const data = await getCTDData('aspirin')
    expect(data.interactions).toHaveLength(1)
    expect(data.interactions[0].geneSymbol).toBe('PTGS2')
    expect(data.interactions[0].source).toContain('DGIdb')
  })

  it('throws when CTD, DGIdb, and Open Targets all return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getDiseaseAssociationsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    await expect(getCTDData('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML when primary and fallbacks fail', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getDiseaseAssociationsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    await expect(getCTDData('aspirin')).rejects.toThrow(/HTML|HTTP 503/)
  })

  it('throws on network when primary and fallbacks fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getDiseaseAssociationsByName as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getCTDData('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getChemicalGeneInteractions', () => {
  it('throws on HTTP 503 when both report URLs fail', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(getChemicalGeneInteractions('aspirin')).rejects.toThrow(/HTTP 503/)
  })
})

describe('CTD trackedSafe honesty', () => {
  test('all-fail HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getDiseaseAssociationsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ctd', getCTDData('aspirin'), { interactions: [], diseaseAssociations: [] }),
    )
    expect(value).toEqual({ interactions: [], diseaseAssociations: [] })
    const row = metrics.find((m) => m.source === 'ctd')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 plus empty fallbacks is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('ctd', getCTDData('aspirin'), { interactions: [], diseaseAssociations: [] }),
    )
    expect(value).toEqual({ interactions: [], diseaseAssociations: [] })
    const row = metrics.find((m) => m.source === 'ctd')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
