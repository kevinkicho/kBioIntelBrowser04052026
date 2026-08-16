/**
 * Discover Pharos TDL leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/api/pharos', () => ({
  getPharosTdlBatch: jest.fn(),
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
        source: 'pharos-tdl',
      })
      const has = spec.hasData ? spec.hasData(data) : Object.keys(data as object).length > 0
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'pharos-tdl',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'pharos-tdl',
        error: msg,
      }
    }
  },
}))

import { GET } from '@/app/api/pharos/tdl/route'
import { getPharosTdlBatch } from '@/lib/api/pharos'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq(symbols: string) {
  return {
    nextUrl: { searchParams: new URLSearchParams({ symbols }) },
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('pharos TDL Discover leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(getPharosTdlBatch as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await GET(fakeReq('EGFR,BRAF'))
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json.tdl).toEqual({})
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty TDL map is empty agent status, not error', async () => {
    ;(getPharosTdlBatch as jest.Mock).mockResolvedValue({})
    const res = await GET(fakeReq('NOSUCH'))
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.tdl).toEqual({})
  })

  it('TDL hits are loaded', async () => {
    ;(getPharosTdlBatch as jest.Mock).mockResolvedValue({ EGFR: 'Tclin' })
    const res = await GET(fakeReq('EGFR'))
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.tdl).toEqual({ EGFR: 'Tclin' })
  })
})
