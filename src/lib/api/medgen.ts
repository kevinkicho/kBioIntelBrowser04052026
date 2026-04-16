import type { MedGenConcept } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'

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
 * Get MedGen concepts by molecule name (wrapper for search)
 */
export async function getMedGenConcepts(moleculeName: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  return searchMedGen(moleculeName, limit)
}

/**
 * Search MedGen for medical genetics concepts by term
 */
export async function searchMedGen(query: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  try {
    // Search MedGen database
    const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${encodeURIComponent(query)}&retmax=${limit}&retmode=json`)
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    // Fetch summaries
    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids.join(',')}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const concept = result[id] || {}
      // Ensure name is a string (API sometimes returns objects)
      const name = typeof concept.name === 'string' ? concept.name : String(concept.title || concept.caption || '')
      // Handle semantictypes (lowercase from API) -> semanticTypes (camelCase in type)
      const semanticTypesRaw = concept.semantictypes || concept.semantic_types || []
      const semanticTypes = Array.isArray(semanticTypesRaw) ? semanticTypesRaw.map(String) : []
      return {
        conceptId: id,
        cui: concept.cui || '',
        name,
        definition: concept.definition || '',
        semanticTypes,
        synonyms: concept.synonyms || [],
        umlsCui: concept.umls_cui || concept.cui || '',
        omimIds: concept.omim_ids || [],
        url: `https://www.ncbi.nlm.nih.gov/medgen/${id}`,
      }
    }).filter((c: MedGenConcept) => c.name)
  } catch (error) {
    console.error('MedGen search error:', error)
    return []
  }
}

/**
 * Get MedGen concept by CUI (Concept Unique Identifier)
 */
export async function getMedGenByCui(cui: string): Promise<MedGenConcept | null> {
  try {
    const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${cui}[CUI]&retmax=1&retmode=json`)
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []
    if (ids.length === 0) return null

    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids[0]}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return null

    const summaryData = await summaryRes.json()
    const concept = summaryData?.result?.[ids[0]]

    if (!concept) return null

      // Ensure name is a string (API sometimes returns objects like {_: "name"})
      let name: string
      if (typeof concept.name === 'string' && concept.name.trim()) {
        name = concept.name
      } else if (concept.name && typeof concept.name === 'object') {
        name = String(concept.name._ || concept.name.value || concept.name.label || concept.title || concept.caption || JSON.stringify(concept.name))
      } else {
        name = String(concept.title || concept.caption || concept.name || '')
      }
    // Handle semantictypes (lowercase from API) -> semanticTypes (camelCase in type)
    const semanticTypesRaw = concept.semantictypes || concept.semantic_types || []
    const semanticTypes = Array.isArray(semanticTypesRaw) ? semanticTypesRaw.map(String) : []
    return {
      conceptId: ids[0],
      cui: concept.cui || cui,
      name,
      definition: concept.definition || '',
      semanticTypes,
      synonyms: concept.synonyms || [],
      umlsCui: concept.umls_cui || concept.cui || '',
      omimIds: concept.omim_ids || [],
      url: `https://www.ncbi.nlm.nih.gov/medgen/${ids[0]}`,
    }
  } catch (error) {
    console.error('MedGen CUI fetch error:', error)
    return null
  }
}

/**
 * Search MedGen for genetic conditions by gene
 */
export async function searchMedGenByGene(geneSymbol: string, limit: number = LIMITS.MEDGEN.initial): Promise<MedGenConcept[]> {
  try {
    // Search for conditions associated with the gene
    const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=medgen&term=${encodeURIComponent(geneSymbol)}+AND+hereditary[Filter]&retmax=${limit}&retmode=json`)
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=medgen&id=${ids.join(',')}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const concept = result[id] || {}
      let name: string
      if (typeof concept.name === 'string' && concept.name.trim()) {
        name = concept.name
      } else if (concept.name && typeof concept.name === 'object') {
        name = String(concept.name._ || concept.name.value || concept.name.label || concept.title || concept.caption || JSON.stringify(concept.name))
      } else {
        name = String(concept.title || concept.caption || concept.name || '')
      }
      const semanticTypesRaw = concept.semantictypes || concept.semantic_types || []
      const semanticTypes = Array.isArray(semanticTypesRaw) ? semanticTypesRaw.map(String) : []
      return {
        conceptId: id,
        cui: concept.cui || '',
        name,
        definition: concept.definition || '',
        semanticTypes,
        synonyms: concept.synonyms || [],
        umlsCui: concept.umls_cui || '',
        omimIds: concept.omim_ids || [],
        url: `https://www.ncbi.nlm.nih.gov/medgen/${id}`,
      }
    }).filter((c: MedGenConcept) => c.name)
  } catch (error) {
    console.error('MedGen gene search error:', error)
    return []
  }
}