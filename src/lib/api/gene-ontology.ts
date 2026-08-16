// Gene Ontology (GO) API Client
// Uses EBI QuickGO API for term search
// http://api.geneontology.org/ used for bioentity queries (annotations)

import { timedFetch } from './timedFetch'

const QUICKGO_URL = 'https://www.ebi.ac.uk/QuickGO/services/ontology/go'
const GO_API_URL = 'https://api.geneontology.org/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

/**
 * GO harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains { terms: [], total: 0 } / [] / null.
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

export interface GOTerm {
  id: string
  label: string
  definition?: string
  aspect: string
  synonyms: string[]
  parents: string[]
  children: string[]
  xrefs: string[]
}

export interface GOAnnotation {
  geneId: string
  geneSymbol: string
  goId: string
  goLabel: string
  aspect: string
  evidence: string
  reference: string
  withFrom: string
}

export interface GOSearchResponse {
  terms: GOTerm[]
  total: number
}

function mapAspect(letter: string): 'biological_process' | 'molecular_function' | 'cellular_component' | 'unknown' {
  if (letter === 'P' || letter === 'F' || letter === 'C') {
    return letter === 'P' ? 'biological_process' : letter === 'F' ? 'molecular_function' : 'cellular_component'
  }
  const lower = (letter || '').toLowerCase()
  if (lower.includes('biological') || lower.includes('process')) return 'biological_process'
  if (lower.includes('molecular') || lower.includes('function')) return 'molecular_function'
  if (lower.includes('cellular') || lower.includes('component')) return 'cellular_component'
  return 'unknown'
}

function mapGoTerm(term: Record<string, unknown>, fallbackId = ''): GOTerm {
  return {
    id: String(term.id ?? fallbackId),
    label: String(term.name ?? ''),
    definition: typeof term.definition === 'object' && term.definition
      ? String((term.definition as Record<string, unknown>).text ?? '')
      : String(term.definition ?? ''),
    aspect: String(term.aspect ?? ''),
    synonyms: Array.isArray(term.synonyms) ? term.synonyms.map(String) : [],
    parents: [],
    children: [],
    xrefs: Array.isArray(term.xrefs) ? term.xrefs.map(String) : [],
  }
}

/**
 * Search GO terms by keyword using QuickGO API
 */
export async function searchGOTerms(query: string, limit = 20): Promise<GOSearchResponse> {
  const q = (query || '').trim()
  if (!q) return { terms: [], total: 0 }

  const params = new URLSearchParams({
    query: q,
    page: '1',
    limit: limit.toString(),
  })
  const url = `${QUICKGO_URL}/search?${params}`
  const res = await timedFetch(url, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'Gene Ontology')
  const data = await res.json()

  return {
    terms: (data.results ?? []).map((doc: Record<string, unknown>) => ({
      id: doc.id ?? '',
      label: doc.name ?? '',
      definition: typeof doc.definition === 'object' && doc.definition ? (doc.definition as Record<string, unknown>).text as string : (doc.definition as string ?? ''),
      aspect: mapAspect(doc.aspect as string ?? 'unknown'),
      synonyms: Array.isArray(doc.synonyms) ? doc.synonyms.map(String) : [],
      parents: [],
      children: [],
      xrefs: [],
    })),
    total: data.numberOfHits ?? (data.results ?? []).length,
  }
}

/**
 * Get GO term details by ID using QuickGO API
 */
export async function getGOTerm(goId: string): Promise<GOTerm | null> {
  const id = (goId || '').trim()
  if (!id) return null

  const url = `${QUICKGO_URL}/terms/${encodeURIComponent(id)}`
  const res = await timedFetch(url, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'Gene Ontology')
  const data = await res.json()
  const results: Record<string, unknown>[] = data.results ?? []
  const term = results[0]
  if (!term) return null
  return mapGoTerm(term, id)
}

/**
 * Get GO annotations for a gene using GO API
 */
export async function getGOAnnotationsForGene(geneId: string): Promise<GOAnnotation[]> {
  const id = (geneId || '').trim()
  if (!id) return []

  const url = `${GO_API_URL}/bioentity/gene/${encodeURIComponent(id)}/function`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'Gene Ontology')
  const data = await res.json()
  return (data.results ?? []).map((ann: Record<string, unknown>) => {
    const annotation = ann.annotation as Record<string, unknown> | undefined
    const annotationObj = annotation?.object as Record<string, unknown> | undefined
    const evidence = ann.evidence as Record<string, unknown> | undefined
    return {
      geneId: (ann.gene as string) ?? '',
      geneSymbol: (ann.gene_label as string) ?? '',
      goId: (annotationObj?.id as string) ?? '',
      goLabel: (annotationObj?.label as string) ?? '',
      aspect: (ann.aspect as string) ?? '',
      evidence: (evidence?.type as string) ?? '',
      reference: (evidence?.with_from as string) ?? '',
      withFrom: (evidence?.with_from as string) ?? '',
    }
  })
}

/**
 * Get GO term ancestors (parent hierarchy) using QuickGO API
 */
export async function getGOTermAncestors(goId: string): Promise<GOTerm[]> {
  const id = (goId || '').trim()
  if (!id) return []

  const url = `${QUICKGO_URL}/terms/${encodeURIComponent(id)}/ancestors`
  const res = await timedFetch(url, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'Gene Ontology')
  const data = await res.json()
  return ((data.results ?? []) as Record<string, unknown>[]).map((term) => mapGoTerm(term))
}

export async function getGOTermDescendants(goId: string): Promise<GOTerm[]> {
  const id = (goId || '').trim()
  if (!id) return []

  const url = `${QUICKGO_URL}/terms/${encodeURIComponent(id)}/descendants`
  const res = await timedFetch(url, {
    ...fetchOptions,
    headers: { Accept: 'application/json' },
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'Gene Ontology')
  const data = await res.json()
  return ((data.results ?? []) as Record<string, unknown>[]).map((term) => mapGoTerm(term))
}

/**
 * Enrichment analysis placeholder (requires gene list)
 */
export async function runGOEnrichment(geneIds: string[]): Promise<Record<string, unknown>> {
  return {
    message: 'GO enrichment analysis requires external tools (g:Profiler, DAVID, clusterProfiler)',
    geneCount: geneIds.length,
  }
}