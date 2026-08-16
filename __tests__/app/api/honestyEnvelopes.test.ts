/**
 * Pipeline / category honesty: timeout must not be cached as empty-success.
 */

const mockGetCached = jest.fn()
const mockSetCache = jest.fn()
const mockGetMoleculeById = jest.fn()
const mockWithTimeout = jest.fn()

jest.mock('@/lib/cache', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCache: (...args: unknown[]) => mockSetCache(...args),
}))

jest.mock('@/lib/api/pubchem', () => ({
  getMoleculeById: (...args: unknown[]) => mockGetMoleculeById(...args),
  PubChemUpstreamError: class PubChemUpstreamError extends Error {},
}))

jest.mock('@/lib/utils', () => {
  const actual = jest.requireActual('@/lib/utils') as Record<string, unknown>
  return {
    ...actual,
    withTimeout: (...args: unknown[]) => mockWithTimeout(...args),
  }
})

jest.mock('@/lib/api-tracker', () => ({
  trackedSafe: jest.fn((_s: string, _p: unknown, fb: unknown) => Promise.resolve(fb)),
}))

jest.mock('@/lib/api/clinicaltrials', () => ({ getClinicalTrialsByName: jest.fn() }))
jest.mock('@/lib/api/chembl-indications', () => ({ getChemblIndicationsByName: jest.fn() }))
jest.mock('@/lib/api/chembl-mechanisms', () => ({ getChemblMechanismsByName: jest.fn() }))
jest.mock('@/lib/api/orangebook', () => ({ getOrangeBookByName: jest.fn() }))
jest.mock('@/lib/api/fda-ndc', () => ({ getNdcProductsByName: jest.fn() }))
jest.mock('@/lib/api/dailymed', () => ({ getDrugLabelsByName: jest.fn() }))
jest.mock('@/lib/api/fda-drug-shortages', () => ({ searchDrugShortages: jest.fn(async () => ({ shortages: [] })) }))
jest.mock('@/lib/api/mychem', () => ({ getMyChemData: jest.fn(async () => ({ chemicals: [] })) }))

import { GET as pipelineGET } from '@/app/api/molecule/[id]/pipeline/route'
import {
  classifyHonestyEnvelope,
  shouldCacheHonestyEnvelope,
} from '@/lib/honestyEnvelope'

function fakeReq() {
  return {} as import('next/server').NextRequest
}

describe('pipeline honesty route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCached.mockReturnValue(undefined)
    mockGetMoleculeById.mockResolvedValue({ name: 'Aspirin', synonyms: [] })
  })

  it('timeout catch is _timeout/_partial, not _emptyHonest, and is not cached', async () => {
    mockWithTimeout.mockRejectedValue(new Error('API call timed out after 15000ms'))
    const res = await pipelineGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._timeout).toBe(true)
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(json._notRetrieved).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('TIMEOUT')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
    expect(res.headers.get('Cache-Control') || '').not.toMatch(/s-maxage/)
  })

  it('empty-as-success is _emptyHonest and is not cached', async () => {
    mockWithTimeout.mockResolvedValue({
      clinicalTrials: [],
      chemblIndications: [],
      chemblMechanisms: [],
      orangeBookEntries: [],
      ndcProducts: [],
      drugLabels: [],
      drugShortages: [],
      myChemAnnotations: [],
    })
    const res = await pipelineGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBe(true)
    expect(json._notRetrieved).toBe(true)
    expect(json._timeout).toBeUndefined()
    expect(classifyHonestyEnvelope(json)).toBe('EMPTY')
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
    expect(res.headers.get('Cache-Control') || '').not.toMatch(/s-maxage/)
  })

  it('rows are cached as success', async () => {
    mockWithTimeout.mockResolvedValue({
      clinicalTrials: [{ nctId: 'NCT1' }],
      chemblIndications: [],
      chemblMechanisms: [],
      orangeBookEntries: [],
      ndcProducts: [],
      drugLabels: [],
      drugShortages: [],
      myChemAnnotations: [],
    })
    const res = await pipelineGET(fakeReq(), { params: { id: '2244' } })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json._timeout).toBeUndefined()
    expect(mockSetCache).toHaveBeenCalled()
    expect(res.headers.get('Cache-Control') || '').toMatch(/s-maxage/)
  })
})

describe('category honesty flags (existing route contract)', () => {
  it('wall-clock timeout shell is TIMEOUT and not cacheable', () => {
    const payload = {
      _partial: true,
      _timeout: true,
      _error: 'Category budget exceeded',
      category: 'pharmaceutical',
      _sourceStatus: {},
    }
    expect(classifyHonestyEnvelope(payload)).toBe('TIMEOUT')
    expect(shouldCacheHonestyEnvelope(payload)).toBe(false)
  })

  it('soft-empty category is EMPTY and not cacheable', () => {
    const payload = {
      _emptyHonest: true,
      _notRetrieved: true,
      _honesty: 'Empty free-API sample this session',
      _sourceStatus: { pubchem: { status: 'empty' } },
    }
    expect(classifyHonestyEnvelope(payload)).toBe('EMPTY')
    expect(shouldCacheHonestyEnvelope(payload)).toBe(false)
  })
})
