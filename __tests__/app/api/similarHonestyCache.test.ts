/**
 * Similar route: empty-as-success must not be cached as a success shell.
 * PubChem similar HTTP errors must not look like honest EMPTY.
 */

const mockGetCached = jest.fn()
const mockSetCache = jest.fn()
const mockGetSimilarMolecules = jest.fn()
const mockGetTargetRelatedMolecules = jest.fn()
const mockGetDrugGeneInteractionsByName = jest.fn()
const mockTimedFetch = jest.fn()

jest.mock('@/lib/cache', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCache: (...args: unknown[]) => mockSetCache(...args),
}))

jest.mock('@/lib/api/pubchem-similar', () => ({
  getSimilarMolecules: (...args: unknown[]) => mockGetSimilarMolecules(...args),
}))

jest.mock('@/lib/api/dgidb', () => ({
  getTargetRelatedMolecules: (...args: unknown[]) => mockGetTargetRelatedMolecules(...args),
  getDrugGeneInteractionsByName: (...args: unknown[]) =>
    mockGetDrugGeneInteractionsByName(...args),
}))

jest.mock('@/lib/api/timedFetch', () => ({
  timedFetch: (...args: unknown[]) => mockTimedFetch(...args),
}))

jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
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
        source: 'similar',
      })
      const has = spec.hasData ? spec.hasData(data) : true
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'similar',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'similar',
        error: msg,
      }
    }
  },
}))

import { GET as similarGET, similarHasRows } from '@/app/api/molecule/[id]/similar/route'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return { signal: undefined } as unknown as import('next/server').NextRequest
}

function loadedNeighbor() {
  return {
    cid: 5000,
    name: 'Mol1',
    formula: 'C2H4',
    molecularWeight: 28,
    imageUrl: 'http://img.png',
  }
}

describe('similar honesty cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCached.mockReturnValue(undefined)
    mockTimedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ PropertyTable: { Properties: [{ Title: 'Aspirin' }] } }),
    })
    mockGetDrugGeneInteractionsByName.mockResolvedValue([])
    mockGetTargetRelatedMolecules.mockResolvedValue([])
  })

  it('similarHasRows treats empty shells as empty and neighbors as rows', () => {
    expect(similarHasRows({ structural: [], targetRelated: [] })).toBe(false)
    expect(similarHasRows({ structural: [loadedNeighbor()], targetRelated: [] })).toBe(true)
    expect(
      similarHasRows({
        structural: [],
        targetRelated: [{ name: 'Ibuprofen', sharedTargets: ['PTGS2'] }],
      }),
    ).toBe(true)
  })

  it('empty-as-success is _emptyHonest and is not cached', async () => {
    mockGetSimilarMolecules.mockResolvedValue([])
    const res = await similarGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBe(true)
    expect(json._notRetrieved).toBe(true)
    expect(json._timeout).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('EMPTY')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })

  it('rows are cached as success', async () => {
    mockGetSimilarMolecules.mockResolvedValue([loadedNeighbor()])
    const res = await similarGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.structural).toHaveLength(1)
    expect(mockSetCache).toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetCached.mockReturnValue({
      structural: [],
      targetRelated: [],
      _emptyHonest: true,
      _notRetrieved: true,
      _honesty: 'stale empty',
    })
    mockGetSimilarMolecules.mockResolvedValue([loadedNeighbor()])
    const res = await similarGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.structural).toHaveLength(1)
    expect(mockGetSimilarMolecules).toHaveBeenCalled()
  })

  it('timeout catch is _timeout/_partial, not _emptyHonest, and is not cached', async () => {
    mockGetSimilarMolecules.mockRejectedValue(new Error('timedFetch timeout after 8000ms'))
    const res = await similarGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._timeout).toBe(true)
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('TIMEOUT')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })

  it('HTTP error is ERROR, not EMPTY, and is not cached', async () => {
    mockGetSimilarMolecules.mockRejectedValue(new Error('HTTP 503'))
    const res = await similarGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })
})
