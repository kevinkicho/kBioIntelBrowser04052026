/**
 * purple-book-patents API leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/api/purpleBookPatents', () => ({
  searchPurpleBookPatentsByName: jest.fn(),
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
        source: 'purple-book-patents',
      })
      const has = spec.hasData ? spec.hasData(data) : false
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'purple-book-patents',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'purple-book-patents',
        error: msg,
      }
    }
  },
}))

import { GET as patentsGET } from '@/app/api/purple-book-patents/route'
import { searchPurpleBookPatentsByName } from '@/lib/api/purpleBookPatents'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return {
    nextUrl: { searchParams: new URLSearchParams('q=adalimumab') },
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('purple-book-patents route honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(searchPurpleBookPatentsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await patentsGET(fakeReq())
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.patents).toEqual([])
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(searchPurpleBookPatentsByName as jest.Mock).mockResolvedValue({ meta: null, patents: [] })
    const res = await patentsGET(fakeReq())
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json.patents).toEqual([])
  })

  it('rows are loaded', async () => {
    ;(searchPurpleBookPatentsByName as jest.Mock).mockResolvedValue({
      meta: { sourceUrl: 'https://purplebooksearch.fda.gov/patent-list', patentCount: 1, loadedAt: '2026-08-16' },
      patents: [{
        blaNumber: 'BLA125057',
        applicant: 'AbbVie',
        proprietaryName: 'Humira',
        properName: 'adalimumab',
        patentNumber: '11083792',
        patentExpirationDate: 'April 4, 2027',
        usptoUrl: 'https://patents.google.com/patent/US11083792/en',
        googlePatentsUrl: 'https://patents.google.com/patent/US11083792/en',
        purpleBookProductUrl: 'https://purplebooksearch.fda.gov/',
      }],
    })
    const res = await patentsGET(fakeReq())
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.patents).toHaveLength(1)
  })
})