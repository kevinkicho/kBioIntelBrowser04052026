import type { MedGenConcept } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

// NCBI credentials from environment
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
const NCBI_API_KEY = getApiKey('NCBI_API_KEY') ?? ''

// Helper to add NCBI credentials to URLs
const withNCBICreds = (url: string): string => {
  const params = new URLSearchParams()
  if (NCBI_EMAIL) params.append('email', NCBI_EMAIL)
  if (NCBI_API_KEY) params.append('api_key', NCBI_API_KEY)
  const creds = params.toString()
  return creds ? `${url}${url.includes('?') ? '&' : '?'}${creds}` : url
}

/**
 * MedGen harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing query, and zero-hit JSON remain empty.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

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

function conceptName(concept: Record<string, unknown>): string {
  if (typeof concept.name === 'string' && concept.name.trim()) return concept.name
  if (concept.name && typeof concept.name === 'object') {
    const n = concept.name as Record<string, unknown>
    return String(n._ || n.value || n.label || concept.title || concept.caption || JSON.stringify(concept.name))
  }
  return String(concept.title || concept.caption || concept.name || '')
}

function mapConcept(id: string, concept: Record<string, unknown>, cuiFallback?: string): MedGenConcept {
  const semanticTypesRaw = concept.semantictypes || concept.semantic_types || []
  const semanticTypes = Array.isArray(semanticTypesRaw) ? semanticTypesRaw.map(String) : []
  return {
    conceptId: id,
    cui: String(concept.cui || cuiFallback || ''),
    name: conceptName(concept),
    definition: String(concept.definition || ''),
    semanticTypes,
    synonyms: (concept.synonyms as string[]) || [],
    umlsCui: String(concept.umls_cui || concept.cui || ''),
    omimIds: (concept.omim_ids as string[]) || [],
    url: `https://www.ncbi.nlm.nih.gov/medgen/${id}`,
  }
}

/**
 * Get MedGen concepts by molecule name (wrapper for search)
 */
export async function getMedGenConcepts(moleculeName: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  return searchMedGen(moleculeName, limit)
}

/**
 * Search MedGen for medical genetics concepts by term
 */
export async function searchMedGen(query: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  const q = query?.trim()
  if (!q) return []

  const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${encodeURIComponent(q)}&retmax=${limit}&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'MedGen')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids.join(',')}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'MedGen')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => mapConcept(id, result[id] || {})).filter((c: MedGenConcept) => c.name)
}

/**
 * Get MedGen concept by CUI (Concept Unique Identifier)
 */
export async function getMedGenByCui(cui: string): Promise<MedGenConcept | null> {
  const q = cui?.trim()
  if (!q) return null

  const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${q}[CUI]&retmax=1&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return null
  throwIfHttpFailed(searchRes, 'MedGen')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return null

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids[0]}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return null
  throwIfHttpFailed(summaryRes, 'MedGen')

  const summaryData = await summaryRes.json()
  const concept = summaryData?.result?.[ids[0]]
  if (!concept) return null

  return mapConcept(ids[0], concept, q)
}

/**
 * Search MedGen for genetic conditions by gene
 */
export async function searchMedGenByGene(geneSymbol: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  const q = geneSymbol?.trim()
  if (!q) return []

  const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${encodeURIComponent(q)}+AND+hereditary[Filter]&retmax=${limit}&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'MedGen')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids.join(',')}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'MedGen')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => mapConcept(id, result[id] || {})).filter((c: MedGenConcept) => c.name)
}
