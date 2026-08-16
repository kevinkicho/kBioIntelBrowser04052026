/**
 * ncbiGene panel leaf: HTTP errors must not look like honest EMPTY.
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

jest.mock('@/lib/api/ncbi-gene', () => ({
  getGeneInfoByName: jest.fn(),
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
        source: 'panel:ncbiGene',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray(data) && (data as unknown[]).length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'panel:ncbiGene',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'panel:ncbiGene',
        error: msg,
      }
    }
  },
}))

import { GET as panelGET } from '@/app/api/molecule/[id]/panel/[panelId]/route'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getGeneInfoByName } from '@/lib/api/ncbi-gene'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return {
    url: 'http://localhost/api/molecule/2244/panel/ncbiGene',
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('ncbiGene panel leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ name: 'Aspirin', cid: 2244, synonyms: [] })
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(getGeneInfoByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'ncbiGene' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.data).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(getGeneInfoByName as jest.Mock).mockResolvedValue([])
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'ncbiGene' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.data).toEqual([])
  })

  it('rows are loaded', async () => {
    ;(getGeneInfoByName as jest.Mock).mockResolvedValue([
      {
        geneId: '1636',
        symbol: 'ACE',
        name: 'angiotensin I converting enzyme',
        summary: '',
        chromosome: '17',
        mapLocation: '',
        organism: 'Homo sapiens',
        url: 'https://www.ncbi.nlm.nih.gov/gene/1636',
      },
    ])
    const res = await panelGET(fakeReq(), { params: { id: '2244', panelId: 'ncbiGene' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.data).toHaveLength(1)
  })
})
