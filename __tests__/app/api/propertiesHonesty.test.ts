/**
 * properties API leaf: HTTP errors must not look like honest EMPTY.
 */
jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/api/pubchem-properties', () => ({
  getComputedPropertiesByCid: jest.fn(),
}))

jest.mock('@/lib/api/pubchem', () => ({
  getMoleculeById: jest.fn(),
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
        source: 'properties',
      })
      const has = spec.hasData ? spec.hasData(data) : data != null
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'properties',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'properties',
        error: msg,
      }
    }
  },
}))

import { GET } from '@/app/api/properties/[id]/route'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'
import { NextRequest } from 'next/server'

describe('properties panel leaf honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('HTTP error is ERROR, not EMPTY', async () => {
    ;(getComputedPropertiesByCid as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const res = await GET(new NextRequest('http://localhost/api/properties/2244'), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json.properties).toBeNull()
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
  })

  it('true empty shell is empty agent status, not error', async () => {
    ;(getComputedPropertiesByCid as jest.Mock).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/properties/9999999'), { params: { id: '9999999' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('empty')
    expect(json._partial).toBeUndefined()
    expect(json.properties).toBeNull()
  })

  it('rows are loaded', async () => {
    ;(getComputedPropertiesByCid as jest.Mock).mockResolvedValue({
      xLogP: 1.2, tpsa: 63.6, hBondDonorCount: 1, hBondAcceptorCount: 4,
      complexity: 212, exactMass: 180.042, charge: 0, rotatableBondCount: 3,
    })
    const res = await GET(new NextRequest('http://localhost/api/properties/2244'), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('loaded')
    expect(json.properties.xLogP).toBe(1.2)
  })
})
