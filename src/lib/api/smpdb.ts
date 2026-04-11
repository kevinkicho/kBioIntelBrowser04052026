import type { SMPDBPathway } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search SMPDB for small molecule pathways
 */
export async function searchSMPDB(query: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  try {
    // SMPDB API endpoint
    const searchUrl = `https://smpdb.ca/search/json?query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const pathways = Array.isArray(searchData) ? searchData : searchData?.pathways || []

    return pathways.slice(0, limit).map((pathway: Record<string, unknown>) => ({
      smpdbId: String(pathway.smpdb_id || pathway.id || ''),
      name: String(pathway.name || pathway.title || ''),
      description: String(pathway.description || pathway.summary || ''),
      pathwayType: String(pathway.pathway_type || pathway.category || ''),
      organism: String(pathway.organism || 'Homo sapiens'),
      metabolites: Array.isArray(pathway.metabolites) ? pathway.metabolites.map((m: unknown) => String(m)) : [],
      enzymes: Array.isArray(pathway.enzymes) ? pathway.enzymes.map((e: unknown) => String(e)) : [],
      url: `https://smpdb.ca/view/${pathway.smpdb_id || pathway.id}`,
    }))
  } catch (error) {
    console.error('SMPDB search error:', error)
    return []
  }
}

/**
 * Get SMPDB pathway details by ID
 */
export async function getSMPDBPathway(smpdbId: string): Promise<SMPDBPathway | null> {
  try {
    const pathwayUrl = `https://smpdb.ca/pathways/${smpdbId}.json`
    const pathwayRes = await fetch(pathwayUrl, fetchOptions)
    if (!pathwayRes.ok) return null

    const pathway = await pathwayRes.json()

    return {
      smpdbId: pathway.smpdb_id || smpdbId,
      name: pathway.name || '',
      description: pathway.description || pathway.summary || '',
      pathwayType: pathway.pathway_type || pathway.category || '',
      organism: pathway.organism || 'Homo sapiens',
      metabolites: Array.isArray(pathway.metabolites) ? pathway.metabolites.map((m: unknown) => String(m)) : [],
      enzymes: Array.isArray(pathway.enzymes) ? pathway.enzymes.map((e: unknown) => String(e)) : [],
      url: `https://smpdb.ca/view/${smpdbId}`,
    }
  } catch (error) {
    console.error('SMPDB pathway fetch error:', error)
    return null
  }
}

/**
 * Search SMPDB by metabolite name
 */
export async function searchSMPDBByMetabolite(metabolite: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  try {
    const searchUrl = `https://smpdb.ca/search/json?metabolite=${encodeURIComponent(metabolite)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const pathways = Array.isArray(searchData) ? searchData : searchData?.pathways || []

    return pathways.slice(0, limit).map((pathway: Record<string, unknown>) => ({
      smpdbId: String(pathway.smpdb_id || pathway.id || ''),
      name: String(pathway.name || ''),
      description: String(pathway.description || ''),
      pathwayType: String(pathway.pathway_type || ''),
      organism: String(pathway.organism || 'Homo sapiens'),
      metabolites: Array.isArray(pathway.metabolites) ? pathway.metabolites.map((m: unknown) => String(m)) : [],
      enzymes: Array.isArray(pathway.enzymes) ? pathway.enzymes.map((e: unknown) => String(e)) : [],
      url: `https://smpdb.ca/view/${pathway.smpdb_id || pathway.id}`,
    }))
  } catch (error) {
    console.error('SMPDB metabolite search error:', error)
    return []
  }
}