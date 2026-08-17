/**
 * hazards API leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/api/pubchem-hazards', () => ({
  getGhsHazardsByCid: jest.fn(),
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
        source: 'hazards',
      })
      const has = spec.hasData ? spec.hasData(data) : data != null
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'hazards',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'hazards',
        error: msg,
      }
    }
  },
}))

import { GET } from '@/app/api/hazards/[id]/route'
import { getGhsHazardsByCid } from '@/lib/api/pubchem-hazards'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'
import { NextRequest } from 'next/server'

describe('hazards panel leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(getGhsHazardsByCid as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await GET(new NextRequest('http://localhost/api/hazards/702'), { params: { id: '702' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.hazards).toBeNull()
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(getGhsHazardsByCid as jest.Mock).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/hazards/9999999'), { params: { id: '9999999' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.hazards).toBeNull()
  })

  it('rows are loaded', async () => {
    ;(getGhsHazardsByCid as jest.Mock).mockResolvedValue({
      signalWord: 'Danger',
      pictogramUrls: ['https://example.com/GHS07.svg'],
      hazardStatements: ['H302: Harmful if swallowed'],
      precautionaryStatements: ['P264: Wash hands'],
    })
    const res = await GET(new NextRequest('http://localhost/api/hazards/702'), { params: { id: '702' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.hazards.signalWord).toBe('Danger')
  })
})
