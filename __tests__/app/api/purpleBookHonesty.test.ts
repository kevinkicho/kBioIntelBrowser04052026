/**
 * purpleBookProducts panel leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/cache', () => ({
  getCached: () => undefined,
  setCache: jest.fn(),
}))

jest.mock('@/lib/api/pubchem', () => ({
  getMoleculeById: jest.fn(),
  PubChemUpstreamError: class PubChemUpstreamError extends Error {},
}))

jest.mock('@/lib/api/purpleBookCache', () => ({
  searchPurpleBookByName: jest.fn(),
}))

jest.mock('@/lib/api/freeApiAgent', () => ({
  freeApiAgent: async (spec: {
    run: (ctx: { signal: AbortSignal; attempt: number; source: string }) => Promise<unknown>
    empty: unknown
    hasData?: (d: unknown) => boolean
  }) => {
    try {
      const data = await spec.run({
        signal: new AbortController().signal,
        attempt: 1,
        source: 'panel:purpleBookProducts',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray(data) && (data as unknown[]).length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'panel:purpleBookProducts',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'panel:purpleBookProducts',
        error: msg,
      }
    }
  },
}))

import { GET as panelGET } from '@/app/api/molecule/[id]/panel/[panelId]/route'
import { getMoleculeById } from '@/lib/api/pubchem'
import { searchPurpleBookByName } from '@/lib/api/purpleBookCache'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return {
    url: 'http://localhost/api/molecule/2244/panel/purpleBookProducts',
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('purpleBookProducts panel leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ name: 'adalimumab', cid: 2244, synonyms: [] })
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(searchPurpleBookByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'purpleBookProducts' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.data).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(searchPurpleBookByName as jest.Mock).mockResolvedValue({ meta: null, products: [] })
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'purpleBookProducts' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.data).toEqual([])
  })

  it('rows are loaded', async () => {
    ;(searchPurpleBookByName as jest.Mock).mockResolvedValue({
      meta: { sourceUrl: 'https://example.test/pb.csv', sourceMonth: '2026-06', productCount: 1, loadedAt: '2026-08-16' },
      products: [{
        applicant: 'AbbVie',
        blaNumber: 'BLA125057',
        proprietaryName: 'Humira',
        properName: 'adalimumab',
        licenseType: '351(a)',
        strength: '40MG/0.8ML',
        dosageForm: 'Injection',
        route: 'Subcutaneous',
        productPresentation: 'Autoinjector',
        marketingStatus: 'Rx',
        licensure: 'Licensed',
        approvalDate: '31-Dec-02',
        interApprovalDate: '',
        refProductProperName: '',
        refProductProprietaryName: '',
        center: 'CDER',
        patentListProvided: 'YES',
        sourceMonth: '2026-06',
        purpleBookUrl: 'https://purplebooksearch.fda.gov/',
        drugsAtFdaUrl: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
      }],
    })
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'purpleBookProducts' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.data).toHaveLength(1)
  })
})
