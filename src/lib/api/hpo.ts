// Human Phenotype Ontology (HPO) API Client
// https://hpo.jax.org/
// Standardized phenotype vocabulary for human disease

import { timedFetch } from './timedFetch'

const BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/hpo/v3'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

/**
 * HPO harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export interface HPOTerm {
  id: string
  name: string
  definition?: string
  synonyms: string[]
  parents: string[]
  children: string[]
  frequency?: string
  comment?: string
}

export interface HPOSearchResponse {
  terms: HPOTerm[]
  total: number
}

/**
 * Search HPO terms by keyword
 */
export async function searchHPOTerms(query: string, limit = 20): Promise<HPOSearchResponse> {
  const q = (query || '').trim()
  if (!q) return { terms: [], total: 0 }

  const params = new URLSearchParams({
    terms: q,
    count: limit.toString(),
    df: 'hpo_id,name,definition,synonyms',
  })
  const url = `${BASE_URL}/search?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'HPO')
  const data = await res.json()

  const total = data[0] ?? 0
  const rowList = data[2] ?? []

  return {
    terms: rowList.map((row: (string | number)[]) => ({
      id: String(row[0] ?? ''),
      name: String(row[1] ?? ''),
      definition: String(row[2] ?? ''),
      synonyms: row[3] ? String(row[3]).split('|') : [],
      parents: [],
      children: [],
    })),
    total,
  }
}

/**
 * Get HPO term details by ID
 */
export async function getHPOTerm(hpoId: string): Promise<HPOTerm | null> {
  const id = (hpoId || '').trim()
  if (!id) return null
  const result = await searchHPOTerms(id, 1)
  return result.terms[0] ?? null
}

/**
 * Get HPO terms associated with a disease (via OMIM or Orphanet)
 */
export async function getHPOForDisease(diseaseId: string): Promise<HPOTerm[]> {
  const raw = (diseaseId || '').trim()
  if (!raw) return []
  // HPO associations are typically accessed via the HPO annotation files
  // For simplicity, search by disease name
  const diseaseName = raw.replace(/OMIM:|ORPHA:/, '')
  const result = await searchHPOTerms(diseaseName, 50)
  return result.terms
}

/**
 * Get HPO term hierarchy (parents)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getHPOTermParents(_hpoId: string): Promise<HPOTerm[]> {
  // HPO doesn't provide direct parent lookup via API
  // Would need to fetch the full HPO ontology file
  return []
}

/**
 * Get similar phenotypes based on HPO term
 */
export async function getSimilarHPOTerms(hpoId: string): Promise<HPOTerm[]> {
  const id = (hpoId || '').trim()
  if (!id) return []
  const baseTerm = await getHPOTerm(id)
  if (!baseTerm) return []

  const query = baseTerm.name.split(' ')[0] // First word for broader search
  const result = await searchHPOTerms(query, 20)
  return result.terms.filter((t) => t.id !== id)
}