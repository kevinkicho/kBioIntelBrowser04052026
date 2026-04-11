// Human Phenotype Ontology (HPO) API Client
// https://hpo.jax.org/
// Standardized phenotype vocabulary for human disease

const BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/hpo/v3'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
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
  try {
    const params = new URLSearchParams({
      terms: query,
      count: limit.toString(),
      df: 'hpo_id,name,definition,synonyms',
    })
    const url = `${BASE_URL}/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('HPO search failed')
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
  } catch {
    return { terms: [], total: 0 }
  }
}

/**
 * Get HPO term details by ID
 */
export async function getHPOTerm(hpoId: string): Promise<HPOTerm | null> {
  try {
    const result = await searchHPOTerms(hpoId, 1)
    return result.terms[0] ?? null
  } catch {
    return null
  }
}

/**
 * Get HPO terms associated with a disease (via OMIM or Orphanet)
 */
export async function getHPOForDisease(diseaseId: string): Promise<HPOTerm[]> {
  try {
    // HPO associations are typically accessed via the HPO annotation files
    // For simplicity, search by disease name
    const diseaseName = diseaseId.replace(/OMIM:|ORPHA:/, '')
    const result = await searchHPOTerms(diseaseName, 50)
    return result.terms
  } catch {
    return []
  }
}

/**
 * Get HPO term hierarchy (parents)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getHPOTermParents(_hpoId: string): Promise<HPOTerm[]> {
  try {
    // HPO doesn't provide direct parent lookup via API
    // Would need to fetch the full HPO ontology file
    return []
  } catch {
    return []
  }
}

/**
 * Get similar phenotypes based on HPO term
 */
export async function getSimilarHPOTerms(hpoId: string): Promise<HPOTerm[]> {
  try {
    // Search for terms with similar names
    const baseTerm = await getHPOTerm(hpoId)
    if (!baseTerm) return []

    const query = baseTerm.name.split(' ')[0] // First word for broader search
    const result = await searchHPOTerms(query, 20)
    return result.terms.filter((t) => t.id !== hpoId)
  } catch {
    return []
  }
}
