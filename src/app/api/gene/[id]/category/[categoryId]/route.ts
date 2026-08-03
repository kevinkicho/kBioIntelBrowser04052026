import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCache } from '@/lib/cache'
import { getCategoryTimeout, isTimeoutError, withTimeout } from '@/lib/utils'
import { flushApiMetrics, runWithApiMetrics } from '@/lib/api-tracker'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { recordMetric } from '@/lib/analytics/db'
import { fetchGene } from '@/lib/categoryFetchers'

const VALID_CATEGORIES = ['gene']

function parseGeneId(id: string): { geneId: string; symbol: string } | null {
  const parts = id.split('-')
  if (parts.length >= 2) {
    return { geneId: parts[0], symbol: parts.slice(1).join('-') }
  }
  return null
}

/** Minimal of-record shell when fan-out hits wall clock — never 500 on timeout. */
function partialGenePayload(geneId: string, symbol: string, message: string) {
  return {
    _partial: true,
    _timeout: true,
    _error: message,
    geneOverview: {
      geneId,
      symbol,
      name: '',
      summary: '',
      chromosome: '',
      mapLocation: '',
      typeOfGene: '',
      aliases: [] as string[],
      ensemblId: '',
      uniprotId: '',
      pathways: [] as string[],
      goAnnotations: {
        biologicalProcess: [] as string[],
        molecularFunction: [] as string[],
        cellularComponent: [] as string[],
      },
      url: `https://www.ncbi.nlm.nih.gov/gene/${geneId}`,
    },
    geneDrugs: [],
    geneDiseases: {
      disgenetAssociations: [],
      ensemblGenes: [],
      gwasAssociations: [],
      clingenGeneDiseases: [],
    },
    geneVariants: {
      clinvarVariants: [],
      dbsnpVariants: [],
      clingenDosage: null,
    },
    geneExpressionData: {
      gtexExpressions: [],
      bgeeExpressions: [],
      expressionAtlasData: [],
    },
    genePathways: {
      reactomePathways: [],
      wikiPathways: [],
      goTerms: [],
      uniprotProteins: [],
      stringInteractions: [],
      pharmgkbGenes: [],
    },
    _sectionStatus: {
      overview: { status: 'empty' as const },
      drugs: { status: 'timeout' as const, error: message },
      diseases: { status: 'timeout' as const, error: message },
      variants: { status: 'timeout' as const, error: message },
      expression: { status: 'timeout' as const, error: message },
      pathways: { status: 'timeout' as const, error: message },
    },
    _sourcesUsed: [] as string[],
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } }
) {
  const geneIdParam = params.id
  const categoryId = params.categoryId

  if (!VALID_CATEGORIES.includes(categoryId)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const parsed = parseGeneId(geneIdParam)
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid gene ID format. Use {entrezId}-{symbol}' },
      { status: 400 },
    )
  }

  const { geneId, symbol } = parsed

  const cacheKey = `gene-category:${geneId}:${symbol}:${categoryId}`
  const forceRefresh =
    request.nextUrl.searchParams.get('refresh') === '1' ||
    request.nextUrl.searchParams.get('refresh') === 'true'
  const cached = forceRefresh ? undefined : getCached<Record<string, unknown>>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const categoryTimeout = getCategoryTimeout(categoryId)

  let data: Record<string, unknown>
  try {
    const ac = new AbortController()
    const { value, metrics } = await runWithApiMetrics(async () =>
      runWithApiAbort(
        ac,
        async () => {
          const fetchPromise = fetchGene(geneId, symbol)
          return await withTimeout(
            fetchPromise as Promise<Record<string, unknown>>,
            categoryTimeout,
            {
              abortController: ac,
              signal: request.signal,
            },
          )
        },
        [request.signal],
      ),
    )
    data = value

    for (const m of metrics) {
      recordMetric({
        source: m.source,
        endpoint: '',
        status: m.status,
        duration_ms: m.duration_ms,
        error: m.error,
        has_data: m.has_data,
      })
    }
  } catch (err) {
    const metrics =
      (err as { __apiMetrics?: ReturnType<typeof flushApiMetrics> })?.__apiMetrics ??
      flushApiMetrics()
    for (const m of metrics) {
      recordMetric({
        source: m.source,
        endpoint: '',
        status: m.status,
        duration_ms: m.duration_ms,
        error: m.error,
        has_data: m.has_data,
      })
    }
    console.error(`[api/gene/category] Error fetching ${categoryId} for gene ${geneId}:`, err)

    if (isTimeoutError(err)) {
      // 200 partial — UI shows empty/timeout sections; live health not hard-fail
      return NextResponse.json(
        partialGenePayload(
          geneId,
          symbol,
          err instanceof Error ? err.message : 'Gene category budget exceeded',
        ),
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch category data',
        category: categoryId,
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    )
  }

  setCache(cacheKey, data)
  return NextResponse.json(data)
}
