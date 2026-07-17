import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getCached, setCache } from '@/lib/cache'
import { getCategoryTimeout, withTimeout } from '@/lib/utils'
import { flushApiMetrics, metricsToSourceStatus } from '@/lib/api-tracker'
import { recordMetric } from '@/lib/analytics/db'
import { buildCategoryApiTrace } from '@/lib/panelApiTrace'

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
    console.error(`[api/category] Error fetching molecule ${cid}:`, error)
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

  // Always resolve structure + UniChem crosswalk so defaults can use InChIKey/CAS/CID/gene
  const identifiers = await getMoleculeIdentifiers(cid)
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
  if (cached) {
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
    return NextResponse.json(payload)
  }

  const categoryTimeout = getCategoryTimeout(categoryId)

  let data: Record<string, unknown>
  let sourceStatus: ReturnType<typeof metricsToSourceStatus> = {}
  try {
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

    data = await withTimeout(fetchPromise as Promise<Record<string, unknown>>, categoryTimeout + 3000)

    const metrics = flushApiMetrics()
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
    const metrics = flushApiMetrics()
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
    console.error(`[api/category] Error fetching ${categoryId} for molecule ${cid}:`, err)
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
  const payload = {
    ...data,
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

  setCache(cacheKey, payload)
  return NextResponse.json(payload)
}
