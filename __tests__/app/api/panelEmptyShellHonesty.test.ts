/**
 * Panel wrappers must not treat { x: [] } object shells as loaded.
 * Same law as the MyGene panel fix.
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

jest.mock('@/lib/api/sider', () => ({ getSIDERData: jest.fn() }))
jest.mock('@/lib/api/peptideatlas', () => ({ getPeptideAtlasData: jest.fn() }))
jest.mock('@/lib/api/kegg', () => ({ getKEGGData: jest.fn() }))
jest.mock('@/lib/api/drugcentral', () => ({ getDrugCentralData: jest.fn() }))
jest.mock('@/lib/api/pharmgkb', () => ({ getPharmGKBData: jest.fn() }))

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
        source: 'panel',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray((data as { data?: unknown }).data) && ((data as { data: unknown[] }).data.length > 0)
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'panel',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      return {
        data: spec.empty,
        status: /timeout|timed?\s*out/i.test(msg) ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'panel',
        error: msg,
      }
    }
  },
}))

import { GET as panelGET } from '@/app/api/molecule/[id]/panel/[panelId]/route'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getSIDERData } from '@/lib/api/sider'
import { getPeptideAtlasData } from '@/lib/api/peptideatlas'
import { getKEGGData } from '@/lib/api/kegg'
import { getDrugCentralData } from '@/lib/api/drugcentral'
import { getPharmGKBData } from '@/lib/api/pharmgkb'

function fakeReq(panelId: string) {
  return {
    url: `http://localhost/api/molecule/2244/panel/${panelId}`,
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('panel empty-shell honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ name: 'Aspirin', cid: 2244, synonyms: [] })
  })

  const cases: Array<{
    panelId: string
    fn: jest.Mock
    empty: unknown
    loaded: unknown
  }> = [
    {
      panelId: 'siderData',
      fn: getSIDERData as unknown as jest.Mock,
      empty: { sideEffects: [] },
      loaded: { sideEffects: [{ sideEffectName: 'nausea' }] },
    },
    {
      panelId: 'peptideAtlas',
      fn: getPeptideAtlasData as unknown as jest.Mock,
      empty: { peptides: [] },
      loaded: { peptides: [{ peptideId: 'P1', sequence: 'AA' }] },
    },
    {
      panelId: 'keggData',
      fn: getKEGGData as unknown as jest.Mock,
      empty: { pathways: [], compounds: [], drugs: [] },
      loaded: { pathways: [{ id: 'hsa00010' }], compounds: [], drugs: [] },
    },
    {
      panelId: 'drugCentral',
      fn: getDrugCentralData as unknown as jest.Mock,
      empty: { drug: null, targets: [] },
      loaded: { drug: { id: 1, name: 'aspirin' }, targets: [] },
    },
    {
      panelId: 'pharmgkb',
      fn: getPharmGKBData as unknown as jest.Mock,
      empty: { drugs: [], genes: [], guidelines: [] },
      loaded: { drugs: [{ id: 'PA1' }], genes: [], guidelines: [] },
    },
  ]

  it.each(cases)('$panelId empty object shell is EMPTY, not loaded', async ({ panelId, fn, empty }) => {
    fn.mockResolvedValue(empty)
    const res = await panelGET(fakeReq(panelId), { params: { id: '2244', panelId } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json.data).toEqual([])
  })

  it.each(cases)('$panelId populated shell is loaded', async ({ panelId, fn, loaded }) => {
    fn.mockResolvedValue(loaded)
    const res = await panelGET(fakeReq(panelId), { params: { id: '2244', panelId } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.data).toHaveLength(1)
  })
})
