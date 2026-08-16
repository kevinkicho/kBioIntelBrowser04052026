/**
 * Category route: empty-as-success must not be cached as a 1h success shell.
 */
const mockGetCached = jest.fn()
const mockSetCache = jest.fn()
const mockGetMoleculeById = jest.fn()
const mockFetchPharmaceutical = jest.fn()

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
    withTimeout: (p: Promise<unknown>) => p,
  }
})

jest.mock('@/lib/categoryFetchers', () => ({
  fetchPharmaceutical: (...args: unknown[]) => mockFetchPharmaceutical(...args),
  fetchClinicalSafety: jest.fn(async () => ({})),
  fetchMolecularChemical: jest.fn(async () => ({})),
  fetchBioactivityTargets: jest.fn(async () => ({})),
  fetchProteinStructure: jest.fn(async () => ({})),
  fetchGenomicsDisease: jest.fn(async () => ({})),
  fetchInteractionsPathways: jest.fn(async () => ({})),
  fetchResearchLiterature: jest.fn(async () => ({})),
  fetchNihHighImpact: jest.fn(async () => ({})),
}))

jest.mock('@/lib/resolveApiQuery', () => ({
  getMoleculeIdentifiers: jest.fn(async () => null),
  resolveApiQuery: jest.fn(() => 'aspirin'),
}))

jest.mock('@/lib/api-tracker', () => ({
  runWithApiMetrics: async (fn: () => Promise<unknown>) => ({
    value: await fn(),
    metrics: [],
  }),
  metricsToSourceStatus: () => ({}),
}))

jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/analytics/db', () => ({
  recordMetric: jest.fn(),
}))

jest.mock('@/lib/panelApiTrace', () => ({
  buildCategoryApiTrace: () => ({ fromCache: false }),
}))

jest.mock('@/lib/serverLog', () => ({
  logApiOutcome: jest.fn(),
  startApiTimer: () => ({ ms: () => 1 }),
}))

import { GET as categoryGET } from '@/app/api/molecule/[id]/category/[categoryId]/route'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

function fakeReq() {
  return {
    nextUrl: { searchParams: new URLSearchParams(), search: '' },
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

describe('category honesty cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCached.mockReturnValue(undefined)
    mockGetMoleculeById.mockResolvedValue({ name: 'Aspirin', synonyms: [] })
  })

  it('empty-as-success is _emptyHonest and is not cached', async () => {
    mockFetchPharmaceutical.mockResolvedValue({})
    const res = await categoryGET(fakeReq(), {
      params: { id: '2244', categoryId: 'pharmaceutical' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBe(true)
    expect(json._notRetrieved).toBe(true)
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })

  it('rows are cached as success', async () => {
    mockFetchPharmaceutical.mockResolvedValue({
      orangeBookEntries: [{ activeIngredient: 'aspirin' }],
    })
    const res = await categoryGET(fakeReq(), {
      params: { id: '2244', categoryId: 'pharmaceutical' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(mockSetCache).toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetCached.mockReturnValue({
      _emptyHonest: true,
      _notRetrieved: true,
      _honesty: 'stale empty',
    })
    mockFetchPharmaceutical.mockResolvedValue({
      orangeBookEntries: [{ activeIngredient: 'aspirin' }],
    })
    const res = await categoryGET(fakeReq(), {
      params: { id: '2244', categoryId: 'pharmaceutical' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.orangeBookEntries).toHaveLength(1)
    expect(mockFetchPharmaceutical).toHaveBeenCalled()
  })
})
