/**
 * Semantic Scholar leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/api/pubchem', () => ({
  getMoleculeById: jest.fn(),
  PubChemUpstreamError: class PubChemUpstreamError extends Error {},
}))

jest.mock('@/lib/api/semantic-scholar', () => ({
  getSemanticPapersByName: jest.fn(),
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
        source: 'semantic-scholar',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray(data) && data.length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'semantic-scholar',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'semantic-scholar',
        error: msg,
      }
    }
  },
}))

import { GET as semanticGET } from '@/app/api/semantic-scholar/[id]/route'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return { signal: undefined } as unknown as import('next/server').NextRequest
}

describe('semantic-scholar leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ name: 'Aspirin', cid: 2244 })
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(getSemanticPapersByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await semanticGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.semanticPapers).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty papers is empty agent status, not error', async () => {
    ;(getSemanticPapersByName as jest.Mock).mockResolvedValue([])
    const res = await semanticGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.semanticPapers).toEqual([])
  })
})