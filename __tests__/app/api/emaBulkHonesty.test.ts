/**
 * emaBulkMedicines panel leaf: HTTP errors must not look like honest EMPTY.
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

jest.mock('@/lib/api/emaMedicinesBulk', () => ({
  searchEmaBulkByName: jest.fn(),
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
        source: 'panel:emaBulkMedicines',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray(data) && (data as unknown[]).length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'panel:emaBulkMedicines',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'panel:emaBulkMedicines',
        error: msg,
      }
    }
  },
}))

import { GET as panelGET } from '@/app/api/molecule/[id]/panel/[panelId]/route'
import { getMoleculeById } from '@/lib/api/pubchem'
import { searchEmaBulkByName } from '@/lib/api/emaMedicinesBulk'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return {
    url: 'http://localhost/api/molecule/2244/panel/emaBulkMedicines',
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('emaBulkMedicines panel leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ name: 'adalimumab', cid: 2244, synonyms: [] })
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(searchEmaBulkByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'emaBulkMedicines' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.data).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(searchEmaBulkByName as jest.Mock).mockResolvedValue({ meta: null, products: [] })
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'emaBulkMedicines' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.data).toEqual([])
  })

  it('rows are loaded', async () => {
    ;(searchEmaBulkByName as jest.Mock).mockResolvedValue({
      meta: { sourceUrl: 'https://example.test/ema.xlsx', productCount: 1, loadedAt: '2026-08-16' },
      products: [{
        name: 'Amgevita',
        emaProductNumber: 'EMEA/H/C/004212',
        medicineStatus: 'Authorised',
        inn: 'adalimumab',
        activeSubstance: 'adalimumab',
        therapeuticArea: 'Arthritis',
        atcCode: 'L04AB04',
        biosimilar: true,
        orphanMedicine: false,
        generic: false,
        advancedTherapy: false,
        conditionalApproval: false,
        applicantHolder: 'Amgen Europe B.V.',
        marketingAuthorisationDate: '2017-03-22',
        emaUrl: 'https://www.ema.europa.eu/en/search?search_api_fulltext=Amgevita',
      }],
    })
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'emaBulkMedicines' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.data).toHaveLength(1)
  })
})
