import type { HMDBMetabolite } from '../types'
import { stripHtml } from '../utils'

const BASE_URL = 'https://hmdb.ca'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search HMDB for metabolites by name
 */
export async function searchMetabolites(query: string): Promise<HMDBMetabolite[]> {
  try {
    // HMDB has a REST API endpoint
    const url = `${BASE_URL}/unearth/q?query=${encodeURIComponent(query)}&search_type=contains`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const text = await res.text()

    // Parse HTML response - HMDB doesn't have a clean JSON API
    const metaboliteLinks = text.match(/\/metabolites\/HMDB\d+/g) ?? []
    const uniqueIds = Array.from(new Set(metaboliteLinks.map(l => l.split('/')[2]))).slice(0, 10)

    // Fetch details for each metabolite
    const metabolites = await Promise.all(
      uniqueIds.slice(0, 5).map(id => getMetaboliteById(id))
    )

    return metabolites.filter((m): m is HMDBMetabolite => m !== null)
  } catch {
    return []
  }
}

/**
 * Get metabolite details by HMDB ID
 */
export async function getMetaboliteById(hmdbId: string): Promise<HMDBMetabolite | null> {
  try {
    const url = `${BASE_URL}/metabolites/${hmdbId}.xml`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const text = await res.text()

    // Parse XML response
    const nameMatch = text.match(/<name>([^<]+)<\/name>/)
    const formulaMatch = text.match(/<formula>([^<]*)<\/formula>/)
    const massMatch = text.match(/<average_molecular_weight>([^<]*)<\/average_molecular_weight>/)
    const smilesMatch = text.match(/<smiles>([^<]*)<\/smiles>/)
    const inchiMatch = text.match(/<inchi>([^<]*)<\/inchi>/)
    const inchiKeyMatch = text.match(/<inchikey>([^<]*)<\/inchikey>/)
    const descriptionMatch = text.match(/<description>([^<]*)<\/description>/)
    const description = stripHtml(descriptionMatch?.[1] ?? '')

    // Extract biospecimen locations
    const biospecimenMatches = text.match(/<biospecimen>([^<]+)<\/biospecimen>/g) ?? []
    const biospecimens = biospecimenMatches.map(m => m.replace(/<\/?biospecimen>/g, ''))

    // Extract tissue locations
    const tissueMatches = text.match(/<tissue>([^<]+)<\/tissue>/g) ?? []
    const tissues = tissueMatches.map(m => m.replace(/<\/?tissue>/g, ''))

    // Extract pathways
    const pathwayMatches = text.match(/<pathway>[\s\S]*?<name>([^<]+)<\/name>/g) ?? []
    const pathways = pathwayMatches.map(m => {
      const nameMatch = m.match(/<name>([^<]+)<\/name>/)
      return nameMatch?.[1] ?? ''
    }).filter(Boolean)

    return {
      hmdbId: hmdbId,
      name: nameMatch?.[1] ?? '',
      formula: formulaMatch?.[1] ?? '',
      molecularWeight: parseFloat(massMatch?.[1] ?? '0'),
      smiles: smilesMatch?.[1] ?? '',
      inchi: inchiMatch?.[1] ?? '',
      inchiKey: inchiKeyMatch?.[1] ?? '',
      description,
      biospecimens: biospecimens.slice(0, 10),
      tissues: tissues.slice(0, 10),
      pathways: pathways.slice(0, 10),
      url: `${BASE_URL}/metabolites/${hmdbId}`
    }
  } catch {
    return null
  }
}

/**
 * Main export: Get HMDB data for a metabolite name
 */
export async function getHMDBData(name: string): Promise<{
  metabolites: HMDBMetabolite[]
}> {
  const metabolites = await searchMetabolites(name)

  return {
    metabolites: metabolites.slice(0, 10)
  }
}