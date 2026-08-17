/**
 * /api/synthesis/[id] leaf: KEGG HTTP errors must not look like honest EMPTY.
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

jest.mock('@/lib/api/kegg', () => ({
  getKeggCompoundId: jest.fn(),
  getKeggReactions: jest.fn(),
  getKeggReactionDetail: jest.fn(),
}))

jest.mock('@/lib/api/rhea', () => ({
  getRheaSynthesisRoutes: jest.fn().mockResolvedValue([]),
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
        source: 'synthesis',
      })
      const has = spec.hasData ? spec.hasData(data) : Array.isArray(data) && data.length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'synthesis',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'synthesis',
        error: msg,
      }
    }
  },
}))

import { GET } from '@/app/api/synthesis/[id]/route'
import { NextRequest } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getKeggCompoundId } from '@/lib/api/kegg'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

describe('GET /api/synthesis/[id] honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMoleculeById as jest.Mock).mockResolvedValue({ cid: 5793, name: 'Glucose', synonyms: [] })
  })

  it('HTTP 503 from KEGG is ERROR and is not cached', async () => {
    ;(getKeggCompoundId as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const req = new NextRequest('http://localhost/api/synthesis/5793')
    const res = await GET(req, { params: { id: '5793' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.routes).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true zero-hit is empty agent status, not error', async () => {
    ;(getKeggCompoundId as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/synthesis/5793')
    const res = await GET(req, { params: { id: '5793' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.routes).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBeNull()
  })
})
