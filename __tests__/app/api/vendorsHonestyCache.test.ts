/**
 * Vendors route: empty-as-success must not be CDN-cached.
 * PubChem SourceName HTTP errors must not look like honest EMPTY.
 */

const mockTimedFetch = jest.fn()

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
        source: 'vendors',
      })
      const has = spec.hasData ? spec.hasData(data) : true
      return {
        data: has ? data : spec.empty,
        status: has ? 'loaded' : 'empty',
        ms: 1,
        attempts: 1,
        source: 'vendors',
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error'
      const timeout = /timeout|timed?\s*out/i.test(msg)
      return {
        data: spec.empty,
        status: timeout ? 'timeout' : 'error',
        ms: 1,
        attempts: 1,
        source: 'vendors',
        error: msg,
      }
    }
  },
}))

import { GET as vendorsGET, vendorsHasRows } from '@/app/api/molecule/[id]/vendors/route'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return { signal: undefined } as unknown as import('next/server').NextRequest
}

function jsonRes(body: unknown, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => body,
  }
}

function mockPubChem(sourceName: unknown, sourceStatus = 200) {
  mockTimedFetch.mockImplementation(async (url: string) => {
    if (url.includes('/property/')) {
      return jsonRes({
        PropertyTable: { Properties: [{ Title: 'Aspirin', InChIKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N' }] },
      })
    }
    if (url.includes('/synonyms/')) {
      return jsonRes({ InformationList: { Information: [{ Synonym: ['aspirin'] }] } })
    }
    if (url.includes('/xrefs/SBURL/')) {
      return jsonRes({ InformationList: { Information: [{ SBURL: [] }] } })
    }
    if (url.includes('/xrefs/SourceName/')) {
      if (sourceStatus !== 200) {
        return jsonRes({}, sourceStatus)
      }
      return jsonRes({
        InformationList: { Information: [{ SourceName: sourceName }] },
      })
    }
    return jsonRes({})
  })
}

describe('vendors honesty cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('vendorsHasRows treats empty shells as empty and suppliers as rows', () => {
    expect(vendorsHasRows({ suppliers: [], databases: [] })).toBe(false)
    expect(
      vendorsHasRows({
        suppliers: [{ name: 'Cayman Chemical', url: 'https://example.com', sourceType: 'supplier' }],
        databases: [],
      }),
    ).toBe(true)
  })

  it('empty-as-success is _emptyHonest and is not CDN-cached', async () => {
    mockPubChem([])
    const res = await vendorsGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBe(true)
    expect(json._notRetrieved).toBe(true)
    expect(json._timeout).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('EMPTY')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(res.headers.get('Cache-Control') || '').not.toMatch(/s-maxage/)
  })

  it('rows are CDN-cached as success', async () => {
    mockPubChem(['Cayman Chemical'])
    const res = await vendorsGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.suppliers.length).toBeGreaterThan(0)
    expect(res.headers.get('Cache-Control') || '').toMatch(/s-maxage/)
  })

  it('HTTP error is ERROR, not EMPTY, and is not CDN-cached', async () => {
    mockPubChem([], 503)
    const res = await vendorsGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(res.headers.get('Cache-Control') || '').not.toMatch(/s-maxage/)
  })

  it('HTML body is ERROR, not EMPTY', async () => {
    mockTimedFetch.mockImplementation(async (url: string) => {
      if (url.includes('/xrefs/SourceName/')) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'text/html' },
          json: async () => ({}),
        }
      }
      return jsonRes({
        PropertyTable: { Properties: [{ Title: 'Aspirin' }] },
      })
    })
    const res = await vendorsGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._agentStatus).toBe('error')
    expect(json._emptyHonest).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('ERROR')
  })
})
