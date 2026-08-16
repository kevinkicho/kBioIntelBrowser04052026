import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from '@/lib/api/pubchem'
import { getCached, setCache } from '@/lib/cache'
import { getCategoryTimeout, isTimeoutError, withTimeout } from '@/lib/utils'
import { metricsToSourceStatus, runWithApiMetrics, type ApiMetric } from '@/lib/api-tracker'
import { runWithApiAbort } from '@/lib/api/apiAbort'
import { recordMetric } from '@/lib/analytics/db'
import { buildCategoryApiTrace } from '@/lib/panelApiTrace'
import { logApiOutcome, startApiTimer } from '@/lib/serverLog'
import { shouldCacheHonestyEnvelope } from '@/lib/honestyEnvelope'

import type { ApiIdentifierType, ApiParamValue } from '@/lib/apiIdentifiers'
import { getMoleculeIdentifiers, resolveApiQuery } from '@/lib/resolveApiQuery'

import {
  fetchPharmaceutical,
  fetchClinicalSafety,
  fetchMolecularChemical,
  fetchBioactivityTargets,
  fetchProteinStructure,
  fetchGenomicsDisease,
  fetchInteractionsPathways,
  fetchResearchLiterature,
  fetchNihHighImpact,
} from '@/lib/categoryFetchers'

const VALID_CATEGORIES = [
  'pharmaceutical', 'clinical-safety', 'molecular-chemical',
  'bioactivity-targets', 'protein-structure', 'genomics-disease',
  'interactions-pathways', 'research-literature', 'nih-high-impact',
]

const VALID_CATEGORY_IDS = new Set(VALID_CATEGORIES)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; categoryId: string } }
) {
  const timer = startApiTimer()
  const cid = parseInt(params.id, 10)
  if (isNaN(cid) || cid < 1) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const categoryId = params.categoryId
  if (!VALID_CATEGORY_IDS.has(categoryId)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  let molecule
  try {
    molecule = await getMoleculeById(cid)
  } catch (error) {
    if (error instanceof PubChemUpstreamError) {
      logApiOutcome({
        route: '/api/molecule/[id]/category/[categoryId]',
        method: 'GET',
        status: 502,
        ms: timer.ms(),
        cid,
        source: 'pubchem',
        categoryId,
        retryable: true,
        error: error.message.slice(0, 200),
      })
      return NextResponse.json(
        {
          error: 'Upstream molecule lookup unavailable',
          retryable: true,
          message: error.message,
        },
        { status: 502 },
      )
    }
    logApiOutcome({
      route: '/api/molecule/[id]/category/[categoryId]',
      method: 'GET',
      status: 500,
      ms: timer.ms(),
      cid,
      categoryId,
      error: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    })
    return NextResponse.json({ error: 'Failed to fetch molecule data' }, { status: 500 })
  }
  if (!molecule) {
    return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
  }

  const name = molecule.name
  const synonyms = molecule.synonyms || []
  const molecularWeight = molecule.molecularWeight || 0

  let overrides: Record<string, ApiIdentifierType> = {}
  let apiParams: Record<string, ApiParamValue> = {}
  try {
    const overridesStr = request.nextUrl.searchParams.get('overrides')
    if (overridesStr) overrides = JSON.parse(overridesStr)
  } catch {}
  try {
    const paramsStr = request.nextUrl.searchParams.get('params')
    if (paramsStr) apiParams = JSON.parse(paramsStr)
  } catch {}

  const MAX_OVERRIDES = 200
  const MAX_PARAMS = 200
  if (Object.keys(overrides).length > MAX_OVERRIDES || Object.keys(apiParams).length > MAX_PARAMS) {
    return NextResponse.json({ error: 'Too many overrides/params' }, { status: 400 })
  }

  // Always resolve structure + UniChem crosswalk so defaults can use InChIKey/CAS/CID/gene.
  // Bound identity resolution so PubChem hang cannot block the whole category.
  const identifiers = await withTimeout(getMoleculeIdentifiers(cid), 6_000).catch(() => null)
  const queryFor = (source: string): string => {
    if (identifiers) {
      const q = resolveApiQuery(identifiers, source, overrides)
      // Empty gene/uniprot queries: callers treat '' as skip
      return q
    }
    return name
  }

  const cacheKey = `category:${cid}:${categoryId}:v2${Object.keys(overrides).length > 0 ? `:${request.nextUrl.searchParams.get('overrides')}` : ''}${Object.keys(apiParams).length > 0 ? `:${request.nextUrl.searchParams.get('params')}` : ''}`
  const forceRefresh =
    request.nextUrl.searchParams.get('refresh') === '1' ||
    request.nextUrl.searchParams.get('refresh') === 'true'
  const requestPath = `/api/molecule/${cid}/category/${categoryId}${request.nextUrl.search || ''}`
  const startedAt = new Date().toISOString()
  const cached = forceRefresh ? undefined : getCached<Record<string, unknown>>(cacheKey)
  // Skip leftover empty/timeout shells so they cannot pin as success for 1h.
  if (cached && shouldCacheHonestyEnvelope(cached)) {
    const finishedAt = new Date().toISOString()
    const existingTrace = cached._apiTrace as ReturnType<typeof buildCategoryApiTrace> | undefined
    const payload = {
      ...cached,
      _apiTrace: existingTrace
        ? {
            ...existingTrace,
            fromCache: true,
            forceRefresh: false,
            finishedAt,
            // Keep original source metrics; note cache hit at category level
            requestPath,
          }
        : buildCategoryApiTrace({
            categoryId,
            cid,
            moleculeName: name,
            requestPath,
            startedAt,
            finishedAt,
            fromCache: true,
            forceRefresh: false,
            metrics: [],
            dataKeys: Object.keys(cached),
          }),
    }
    logApiOutcome({
      route: '/api/molecule/[id]/category/[categoryId]',
      method: 'GET',
      status: 200,
      ms: timer.ms(),
      cid,
      categoryId,
      fromCache: true,
    })
    return NextResponse.json(payload)
  }

  const categoryTimeout = getCategoryTimeout(categoryId)

  let data: Record<string, unknown>
  let sourceStatus: ReturnType<typeof metricsToSourceStatus> = {}
  try {
    // Isolate perApiMetrics for this request — concurrent category loads on the
    // same Node process must not steal/merge each other's timeout/error rows.
    // runWithApiAbort patches fetch (ALS) so wall-clock / client disconnect stop
    // in-flight free-API sockets, not just the Node wait.
    const { value, metrics } = await runWithApiMetrics(async () => {
      const ac = new AbortController()
      return await runWithApiAbort(
        ac,
        async () => {
          const fetchPromise = (async () => {
            switch (categoryId) {
              case 'pharmaceutical':
                return await fetchPharmaceutical(name, synonyms, queryFor, apiParams)
              case 'clinical-safety':
                return await fetchClinicalSafety(name, queryFor, apiParams)
              case 'molecular-chemical':
                return await fetchMolecularChemical(name, cid, molecularWeight, queryFor, apiParams)
              case 'bioactivity-targets':
                return await fetchBioactivityTargets(name, queryFor, apiParams)
              case 'protein-structure':
                return await fetchProteinStructure(name, queryFor, apiParams)
              case 'genomics-disease':
                return await fetchGenomicsDisease(name, queryFor, apiParams)
              case 'interactions-pathways':
                return await fetchInteractionsPathways(name, queryFor, apiParams)
              case 'research-literature':
                return await fetchResearchLiterature(name, queryFor, apiParams)
              case 'nih-high-impact':
                return await fetchNihHighImpact(name, queryFor)
              default:
                return null
            }
          })()

          // Wall clock = category budget only (no +3s slack) so App Hosting
          // returns before edge/proxy idle kill; leaf fetches capped by ALS patch.
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
      )
    })

    data = value
    sourceStatus = metricsToSourceStatus(metrics)
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
    const metrics: ApiMetric[] =
      (err as { __apiMetrics?: ApiMetric[] })?.__apiMetrics ?? []
    sourceStatus = metricsToSourceStatus(metrics)
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

    // Timeout / abort: return 200 partial so UI + live health get a payload
    // (empty panels with timeout provenance) instead of hanging or 500.
    if (isTimeoutError(err)) {
      const finishedAt = new Date().toISOString()
      const metricsForTrace = Object.entries(sourceStatus).map(([source, v]) => ({
        source,
        status:
          v.status === 'timeout' ? 408 : v.status === 'error' ? 500 : v.status === 'disabled' ? 503 : 200,
        duration_ms: v.duration_ms ?? 0,
        error: v.error,
        has_data: v.has_data,
        loadStatus: v.status,
      }))
      const payload = {
        _partial: true,
        _timeout: true,
        _error: err instanceof Error ? err.message : 'Category budget exceeded',
        category: categoryId,
        _sourceStatus: sourceStatus,
        _apiTrace: buildCategoryApiTrace({
          categoryId,
          cid,
          moleculeName: name,
          requestPath,
          startedAt,
          finishedAt,
          fromCache: false,
          forceRefresh,
          metrics: metricsForTrace,
          dataKeys: [],
        }),
        _identifiers: identifiers
          ? {
              cid: identifiers.cid,
              inchiKey: identifiers.inchiKey || undefined,
              cas: identifiers.cas || undefined,
              chemblId: identifiers.chemblId,
              geneSymbols: identifiers.geneSymbols.slice(0, 10),
            }
          : undefined,
      }
      logApiOutcome({
        route: '/api/molecule/[id]/category/[categoryId]',
        method: 'GET',
        status: 200,
        ms: timer.ms(),
        cid,
        categoryId,
        error: 'partial_timeout',
      })
      // Do not cache timeout shells as full success
      return NextResponse.json(payload)
    }

    logApiOutcome({
      route: '/api/molecule/[id]/category/[categoryId]',
      method: 'GET',
      status: 500,
      ms: timer.ms(),
      cid,
      categoryId,
      error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
    })
    return NextResponse.json({
      error: 'Failed to fetch category data',
      category: categoryId,
      message: err instanceof Error ? err.message : 'Unknown error',
      _sourceStatus: sourceStatus,
    }, { status: 500 })
  }

  const finishedAt = new Date().toISOString()
  // sourceStatus already built from flushApiMetrics() in try block
  const metricsForTrace = Object.entries(sourceStatus).map(([source, v]) => ({
    source,
    status: v.status === 'timeout' ? 408 : v.status === 'error' ? 500 : v.status === 'disabled' ? 503 : 200,
    duration_ms: v.duration_ms ?? 0,
    error: v.error,
    has_data: v.has_data,
    loadStatus: v.status,
  }))

  // Attach per-source status for UI honesty (data vs empty vs timeout vs error vs disabled)
  const dataKeys = Object.keys(data ?? {}).filter((k) => !k.startsWith('_'))
  const hasPanelPayload = dataKeys.some((k) => {
    const v = (data as Record<string, unknown>)[k]
    if (v == null) return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.keys(v as object).length > 0
    return true
  })
  const payload = {
    ...data,
    // Soft-empty honesty: 200 with no panel rows is of-record "not retrieved this session"
    ...(!hasPanelPayload
      ? {
          _emptyHonest: true,
          _notRetrieved: true,
          _honesty:
            'Empty free-API sample this session — not proof of zero association forever. Retry or densify later.',
        }
      : {}),
    _sourceStatus: sourceStatus,
    _apiTrace: buildCategoryApiTrace({
      categoryId,
      cid,
      moleculeName: name,
      requestPath,
      startedAt,
      finishedAt,
      fromCache: false,
      forceRefresh,
      metrics: metricsForTrace,
      dataKeys: Object.keys(data ?? {}),
    }),
    _identifiers: identifiers
      ? {
          cid: identifiers.cid,
          inchiKey: identifiers.inchiKey || undefined,
          cas: identifiers.cas || undefined,
          chemblId: identifiers.chemblId,
          geneSymbols: identifiers.geneSymbols.slice(0, 10),
        }
      : undefined,
  }

  // Empty-as-success must not be stored as a 1h success shell (same rule as pipeline).
  if (shouldCacheHonestyEnvelope(payload) && hasPanelPayload) {
    setCache(cacheKey, payload)
  }
  logApiOutcome({
    route: '/api/molecule/[id]/category/[categoryId]',
    method: 'GET',
    status: 200,
    ms: timer.ms(),
    cid,
    categoryId,
    fromCache: false,
  })
  return NextResponse.json(payload)
}
