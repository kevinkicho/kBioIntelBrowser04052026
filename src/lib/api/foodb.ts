import type { FoodBCompound } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://foodb.ca/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search FooDB for food compounds
 * FooDB contains information on food constituents and metabolites
 */
export async function searchFooDB(query: string, limit: number = 20): Promise<FoodBCompound[]> {
  try {
    const url = `${BASE_URL}/compounds/search.json?q=${encodeURIComponent(query)}&per_page=${limit}`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }

    const data = await res.json()
    const compounds = data.compounds || []

    return compounds.map((compound: Record<string, unknown>) => {
      const c = compound as Record<string, unknown>
      return {
        id: String(c.id || ''),
        name: String(c.name || c.common_name || ''),
        description: String(c.description || ''),
        formula: String(c.formula || ''),
        inchi: String(c.inchi || ''),
        inchiKey: String(c.inchi_key || ''),
        smiles: String(c.smiles || ''),
        mass: parseFloat(String(c.average_mass || c.monoisotopic_mass || '0')),
        casRegistryNumber: String(c.cas_registry_number || ''),
        foodSources: parseFoodSources(c.food_sources || c.foods || ''),
        synonyms: Array.isArray(c.synonyms) ? c.synonyms.map(String) : [],
        url: `https://foodb.ca/compounds/${c.id || ''}`,
      }
    }).filter((c: FoodBCompound) => c.name)
  } catch (error) {
    console.error('FooDB search error:', error)
    throw error
  }
}

/**
 * Get FooDB compound details by ID
 */
export async function getFooDBCompound(id: string): Promise<FoodBCompound | null> {
  try {
    const url = `${BASE_URL}/compounds/${id}.json`
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }

    const data = await res.json()
    const c = data.compound || data

    return {
      id: String(c.id || ''),
      name: String(c.name || c.common_name || ''),
      description: String(c.description || ''),
      formula: String(c.formula || ''),
      inchi: String(c.inchi || ''),
      inchiKey: String(c.inchi_key || ''),
      smiles: String(c.smiles || ''),
      mass: parseFloat(String(c.average_mass || c.monoisotopic_mass || '0')),
      casRegistryNumber: String(c.cas_registry_number || ''),
      foodSources: parseFoodSources(c.food_sources || c.foods || ''),
      synonyms: Array.isArray(c.synonyms) ? c.synonyms.map(String) : [],
      url: `https://foodb.ca/compounds/${c.id || ''}`,
    }
  } catch (error) {
    console.error('FooDB compound fetch error:', error)
    throw error
  }
}

function parseFoodSources(sources: unknown): string[] {
  if (Array.isArray(sources)) {
    return sources.map(String)
  }
  if (typeof sources === 'string' && sources.trim()) {
    return sources.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}
