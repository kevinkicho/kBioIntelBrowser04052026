// OLS - Ontology Lookup Service API Client
// https://www.ebi.ac.uk/ols4/api
// 270+ ontologies, 8-10M classes

import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.ebi.ac.uk/ols4/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

/**
 * OLS harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export interface OLSOntology {
  ontologyId: string
  name: string
  title: string
  description: string
  version: string
  url: string
}

export interface OLSTerm {
  id: string
  label: string
  iri: string
  ontologyId: string
  description?: string
  synonyms: string[]
  parents: string[]
  children: string[]
  ancestors: string[]
  descendants: string[]
  mappings: { source: string; url: string }[]
}

export interface OLSSearchResponse {
  terms: OLSTerm[]
  total: number
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}

function mapOlsTerm(term: Record<string, unknown>): OLSTerm {
  return {
    id: String(term.ontologyId ?? term.obo_id ?? term.id ?? ''),
    label: String(term.label ?? ''),
    iri: String(term.iri ?? ''),
    ontologyId: String(term.ontologyId ?? term.ontology_prefix ?? term.ontology_name ?? ''),
    description: Array.isArray(term.description)
      ? String(term.description[0] ?? '')
      : String(term.description ?? ''),
    synonyms: Array.isArray(term.synonym)
      ? term.synonym.map(String)
      : Array.isArray(term.synonyms)
        ? term.synonyms.map(String)
        : [],
    parents: asRecordArray(term.parents).map((p) => String(p.id ?? '')),
    children: asRecordArray(term.children).map((c) => String(c.id ?? '')),
    ancestors: asRecordArray(term.ancestors).map((a) => String(a.id ?? '')),
    descendants: asRecordArray(term.descendants).map((d) => String(d.id ?? '')),
    mappings: asRecordArray(term.mappings).map((m) => ({
      source: String(m.source ?? ''),
      url: String(m.url ?? ''),
    })),
  }
}

function termsFromSearchPayload(data: Record<string, unknown>): OLSTerm[] {
  const embedded = (data.embedded ?? data._embedded) as Record<string, unknown> | undefined
  const response = data.response as Record<string, unknown> | undefined
  const raw = embedded?.terms ?? response?.docs ?? []
  return asRecordArray(raw).map(mapOlsTerm)
}

/**
 * Search across all ontologies
 */
export async function searchOLS(query: string, limit = 20): Promise<OLSSearchResponse> {
  const q = (query || '').trim()
  if (!q) return { terms: [], total: 0 }

  const params = new URLSearchParams({
    q,
    size: limit.toString(),
    start: '0',
  })
  const url = `${BASE_URL}/search?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'OLS')
  const data = (await res.json()) as Record<string, unknown>
  const terms = termsFromSearchPayload(data)
  const page = data.page as Record<string, unknown> | undefined
  const response = data.response as Record<string, unknown> | undefined
  const total =
    (typeof page?.totalElements === 'number' ? page.totalElements : undefined) ??
    (typeof response?.numFound === 'number' ? response.numFound : undefined) ??
    terms.length
  return { terms, total }
}

/**
 * Get term by IRI
 */
export async function getOLSTermByIri(iri: string): Promise<OLSTerm | null> {
  const q = (iri || '').trim()
  if (!q) return null

  const encodedIri = encodeURIComponent(q)
  const url = `${BASE_URL}/entities?iri=${encodedIri}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'OLS')
  const data = (await res.json()) as Record<string, unknown>
  if (!data || (!data.iri && !data.label && !data.ontologyId)) return null
  return mapOlsTerm(data)
}

/**
 * Search within a specific ontology
 */
export async function searchOntology(
  ontologyId: string,
  query: string,
  limit = 20,
): Promise<OLSTerm[]> {
  const ont = (ontologyId || '').trim()
  const q = (query || '').trim()
  if (!ont || !q) return []

  const params = new URLSearchParams({
    q,
    ontologyId: ont,
    size: limit.toString(),
  })
  const url = `${BASE_URL}/search?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'OLS')
  const data = (await res.json()) as Record<string, unknown>
  return termsFromSearchPayload(data)
}

/**
 * List all available ontologies
 */
export async function listOLSOntologies(): Promise<OLSOntology[]> {
  const url = `${BASE_URL}/ontologies`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'OLS')
  const data = (await res.json()) as Record<string, unknown>
  const embedded = (data._embedded ?? data.embedded) as Record<string, unknown> | undefined
  return asRecordArray(embedded?.ontologies).map((o) => {
    const links = o._links as Record<string, unknown> | undefined
    const self = links?.self as Record<string, unknown> | undefined
    return {
      ontologyId: String(o.ontologyId ?? ''),
      name: String(o.name ?? ''),
      title: String(o.title ?? ''),
      description: String(o.description ?? ''),
      version: String(o.version ?? ''),
      url: String(self?.href ?? ''),
    }
  })
}

/**
 * Get terms from a specific ontology
 */
export async function getOntologyTerms(ontologyId: string): Promise<OLSTerm[]> {
  const ont = (ontologyId || '').trim()
  if (!ont) return []

  const url = `${BASE_URL}/ontologies/${encodeURIComponent(ont)}/terms`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'OLS')
  const data = (await res.json()) as Record<string, unknown>
  const embedded = (data._embedded ?? data.embedded) as Record<string, unknown> | undefined
  return asRecordArray(embedded?.terms).map(mapOlsTerm)
}
