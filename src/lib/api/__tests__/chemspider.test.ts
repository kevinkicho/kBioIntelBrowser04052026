/**
 * @jest-environment node
 */

import { searchChemSpider, getChemSpiderCompound } from '../chemspider'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function urlOf(input: unknown): string {
  return String(input)
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
})

describe('searchChemSpider', () => {
  it('returns empty for blank query without network', async () => {
    await expect(searchChemSpider('')).resolves.toEqual([])
    await expect(searchChemSpider('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps PubChem fallback compound rows', async () => {
    ;(fetch as jest.Mock).mockImplementation(async (input: unknown) => {
      const url = urlOf(input)
      if (url.includes('/cids/JSON')) return jsonRes({ IdentifierList: { CID: [2244] } })
      if (url.includes('/property/')) {
        return jsonRes({
          PropertyTable: {
            Properties: [{
              CID: 2244,
              MolecularFormula: 'C9H8O4',
              MolecularWeight: '180.16',
              InChIKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
              InChI: 'InChI=1S/C9H8O4',
              CanonicalSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O',
            }],
          },
        })
      }
      if (url.includes('/synonyms/')) return jsonRes({ InformationList: { Information: [] } })
      return jsonRes({}, 404)
    })
    const rows = await searchChemSpider('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].csId).toBe('2244')
    expect(rows[0].formula).toBe('C9H8O4')
    expect(rows[0].sources).toContain('PubChem')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('pubchem.ncbi.nlm.nih.gov')
  })

  it('zero-hit CID list is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({ IdentifierList: { CID: [] } }))
    expect(await searchChemSpider('unknownxyzcs')).toEqual([])
  })

  it('404 on PubChem name search is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await searchChemSpider('aspirin')).toEqual([])
  })

  it('throws when PubChem fallback returns HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    await expect(searchChemSpider('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    await expect(searchChemSpider('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error (not EMPTY)', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(searchChemSpider('aspirin')).rejects.toThrow(/network/)
  })
})

describe('getChemSpiderCompound', () => {
  it('throws on HTTP 503 (not null-as-empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 503))
    await expect(getChemSpiderCompound('2244')).rejects.toThrow(/HTTP 503/)
  })

  it('404 is null (true empty)', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes({}, 404))
    expect(await getChemSpiderCompound('999999')).toBeNull()
  })
})

describe('ChemSpider trackedSafe honesty', () => {
  test('HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('chemspider', searchChemSpider('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'chemspider')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('chemspider', searchChemSpider('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'chemspider')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})
