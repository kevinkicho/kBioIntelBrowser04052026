/**
 * Gene category route: empty-as-success must not be cached as a 1h success shell.
 */
const mockGetCached = jest.fn()
const mockSetCache = jest.fn()
const mockFetchGene = jest.fn()
const mockWithTimeout = jest.fn()

jest.mock('@/lib/cache', () => ({
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCache: (...args: unknown[]) => mockSetCache(...args),
}))

jest.mock('@/lib/utils', () => {
  const actual = jest.requireActual('@/lib/utils') as Record<string, unknown>
  return {
    ...actual,
    withTimeout: (...args: unknown[]) => mockWithTimeout(...args),
  }
})

jest.mock('@/lib/categoryFetchers', () => ({
  fetchGene: (...args: unknown[]) => mockFetchGene(...args),
}))

jest.mock('@/lib/api-tracker', () => ({
  runWithApiMetrics: async (fn: () => Promise<unknown>) => ({
    value: await fn(),
    metrics: [],
  }),
  flushApiMetrics: () => [],
}))

jest.mock('@/lib/api/apiAbort', () => ({
  runWithApiAbort: (_ac: unknown, fn: () => Promise<unknown>) => fn(),
}))

jest.mock('@/lib/analytics/db', () => ({
  recordMetric: jest.fn(),
}))

import { GET as geneGET, hasGenePanelPayload } from '@/app/api/gene/[id]/category/[categoryId]/route'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

function fakeReq(refresh = false) {
  const params = new URLSearchParams()
  if (refresh) params.set('refresh', '1')
  return {
    nextUrl: { searchParams: params, search: refresh ? '?refresh=1' : '' },
    signal: undefined,
  } as unknown as import('next/server').NextRequest
}

function emptyGenePayload() {
  return {
    geneOverview: { geneId: '1956', symbol: 'EGFR', name: '', summary: '' },
    geneDrugs: [],
    geneDiseases: {
      disgenetAssociations: [],
      ensemblGenes: [],
      gwasAssociations: [],
      clingenGeneDiseases: [],
    },
    geneVariants: { clinvarVariants: [], dbsnpVariants: [], clingenDosage: null },
    geneExpressionData: { gtexExpressions: [], bgeeExpressions: [], expressionAtlasData: [] },
    genePathways: {
      reactomePathways: [],
      wikiPathways: [],
      goTerms: [],
      uniprotProteins: [],
      stringInteractions: [],
      pharmgkbGenes: [],
    },
    _sectionStatus: {
      overview: { status: 'empty' },
      drugs: { status: 'empty' },
      diseases: { status: 'empty' },
      variants: { status: 'empty' },
      expression: { status: 'empty' },
      pathways: { status: 'empty' },
    },
    _sourcesUsed: [],
  }
}

function loadedGenePayload() {
  return {
    ...emptyGenePayload(),
    geneOverview: {
      geneId: '1956',
      symbol: 'EGFR',
      name: 'epidermal growth factor receptor',
      summary: 'receptor tyrosine kinase',
    },
    geneDrugs: [{ drugName: 'erlotinib' }],
    _sectionStatus: {
      overview: { status: 'loaded' },
      drugs: { status: 'loaded' },
      diseases: { status: 'empty' },
      variants: { status: 'empty' },
      expression: { status: 'empty' },
      pathways: { status: 'empty' },
    },
  }
}

describe('gene category honesty cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCached.mockReturnValue(undefined)
    mockWithTimeout.mockImplementation((p: Promise<unknown>) => p)
  })

  it('hasGenePanelPayload treats empty shells as empty and loaded overview as rows', () => {
    expect(hasGenePanelPayload(emptyGenePayload())).toBe(false)
    expect(hasGenePanelPayload(loadedGenePayload())).toBe(true)
    expect(
      hasGenePanelPayload({
        _partial: true,
        _timeout: true,
        geneOverview: { name: '', summary: '' },
        _sectionStatus: { overview: { status: 'empty' }, drugs: { status: 'timeout' } },
      }),
    ).toBe(false)
  })

  it('empty-as-success is _emptyHonest and is not cached', async () => {
    mockFetchGene.mockResolvedValue(emptyGenePayload())
    const res = await geneGET(fakeReq(), {
      params: { id: '1956-EGFR', categoryId: 'gene' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBe(true)
    expect(json._notRetrieved).toBe(true)
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })

  it('rows are cached as success', async () => {
    mockFetchGene.mockResolvedValue(loadedGenePayload())
    const res = await geneGET(fakeReq(), {
      params: { id: '1956-EGFR', categoryId: 'gene' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.geneDrugs).toHaveLength(1)
    expect(mockSetCache).toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetCached.mockReturnValue({
      ...emptyGenePayload(),
      _emptyHonest: true,
      _notRetrieved: true,
    })
    mockFetchGene.mockResolvedValue(loadedGenePayload())
    const res = await geneGET(fakeReq(), {
      params: { id: '1956-EGFR', categoryId: 'gene' },
    })
    const json = await res.json()
    expect(json._emptyHonest).toBeUndefined()
    expect(json.geneDrugs).toHaveLength(1)
    expect(mockFetchGene).toHaveBeenCalled()
  })

  it('timeout catch is _timeout/_partial, not _emptyHonest, and is not cached', async () => {
    mockWithTimeout.mockRejectedValue(new Error('API call timed out after 12000ms'))
    const res = await geneGET(fakeReq(), {
      params: { id: '1956-EGFR', categoryId: 'gene' },
    })
    const json = await res.json()
    expect(json._timeout).toBe(true)
    expect(json._partial).toBe(true)
    expect(json._emptyHonest).toBeUndefined()
    expect(shouldCacheHonestyEnvelope(json)).toBe(false)
    expect(mockSetCache).not.toHaveBeenCalled()
  })
})
