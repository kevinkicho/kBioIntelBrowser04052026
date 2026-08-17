/**
 * @jest-environment node
 */

import { getChemicalInteractionsByName } from '../stitch'
import { getDrugGeneInteractionsByName } from '../dgidb'
import { getChemblActivitiesByName } from '../chembl'
import { runWithApiMetrics, trackedSafe } from '@/lib/api-tracker'
import { resetRateLimitBuckets } from '@/lib/rateLimit'

jest.mock('../dgidb', () => ({
  getDrugGeneInteractionsByName: jest.fn(),
}))

jest.mock('../chembl', () => ({
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

const stringRow = {
  stringId_A: 'CIDm00002244',
  stringId_B: '9606.ENSP00000290421',
  preferredName_A: 'aspirin',
  preferredName_B: 'PTGS2',
  score: '0.95',
  escore: '0.7',
  dscore: '0.8',
  tscore: '0.6',
}

global.fetch = jest.fn()
beforeEach(() => {
  jest.resetAllMocks()
  resetRateLimitBuckets()
  ;(getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([])
  ;(getChemblActivitiesByName as jest.Mock).mockResolvedValue([])
})

describe('getChemicalInteractionsByName', () => {
  it('returns empty for blank query without network', async () => {
    await expect(getChemicalInteractionsByName('')).resolves.toEqual([])
    await expect(getChemicalInteractionsByName('   ')).resolves.toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps STRING chemical-protein rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce(jsonRes([stringRow]))
    const rows = await getChemicalInteractionsByName('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].chemicalName).toBe('aspirin')
    expect(rows[0].proteinName).toBe('PTGS2')
    expect(rows[0].combinedScore).toBe(0.95)
    expect(rows[0].url).toContain('string-db.org/network/')
    expect(JSON.stringify((fetch as jest.Mock).mock.calls)).toContain('string-db.org')
    expect(getDrugGeneInteractionsByName).not.toHaveBeenCalled()
  })

  it('zero-hit JSON from all sources is empty (not error)', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes([]))
    expect(await getChemicalInteractionsByName('unknownxyz')).toEqual([])
  })

  it('404 on STRING plus empty fallbacks is honest EMPTY', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    expect(await getChemicalInteractionsByName('aspirin')).toEqual([])
  })

  it('throws when STRING, DGIdb, and ChEMBL all return HTTP 503', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    await expect(getChemicalInteractionsByName('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('throws on HTML body when all sources fail', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes('<html>nope</html>', 200, 'text/html'))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTML response from DGIdb'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('HTML response from ChEMBL'))
    await expect(getChemicalInteractionsByName('aspirin')).rejects.toThrow(/HTML/)
  })

  it('throws on network error when all sources fail', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('network'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('network'))
    await expect(getChemicalInteractionsByName('aspirin')).rejects.toThrow(/network/)
  })

  it('STRING 503 still uses DGIdb rows', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockResolvedValue([
      {
        drugName: 'aspirin',
        geneSymbol: 'PTGS1',
        geneName: 'PTGS1',
        interactionType: 'inhibitor',
        evidence: 'DrugBank',
        source: 'DrugBank',
        score: 0.8,
        url: 'https://www.dgidb.org/results?searchType=drug&searchTerms=aspirin',
      },
    ])
    const rows = await getChemicalInteractionsByName('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].proteinName).toBe('PTGS1')
    expect(rows[0].url).toContain('dgidb.org')
  })

  it('STRING empty + DGIdb fail still uses ChEMBL activities', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes([]))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getChemblActivitiesByName as jest.Mock).mockResolvedValue([
      {
        chemblId: 'CHEMBL25',
        targetChemblId: 'CHEMBL230',
        targetName: 'Cyclooxygenase-2',
        standardValue: 10,
        url: 'https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL230/',
      },
    ])
    const rows = await getChemicalInteractionsByName('aspirin')
    expect(rows).toHaveLength(1)
    expect(rows[0].proteinName).toBe('Cyclooxygenase-2')
    expect(rows[0].url).toContain('chembl')
  })
})

describe('STITCH trackedSafe honesty', () => {
  test('all-fail HTTP 503 is error, not empty, in category metrics', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 503))
    ;(getDrugGeneInteractionsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getChemblActivitiesByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('stitch', getChemicalInteractionsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'stitch')
    expect(row?.loadStatus).toBe('error')
    expect(row?.error).toMatch(/HTTP 503/)
    expect(row?.has_data).toBe(false)
  })

  test('true 404 is empty, not error', async () => {
    ;(fetch as jest.Mock).mockResolvedValue(jsonRes({}, 404))
    const { value, metrics } = await runWithApiMetrics(async () =>
      trackedSafe('stitch', getChemicalInteractionsByName('aspirin'), []),
    )
    expect(value).toEqual([])
    const row = metrics.find((m) => m.source === 'stitch')
    expect(row?.loadStatus).not.toBe('error')
    expect(row?.loadStatus).not.toBe('timeout')
    expect(row?.error).toBeUndefined()
  })
})