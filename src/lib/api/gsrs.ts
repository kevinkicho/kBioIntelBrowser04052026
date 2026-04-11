import type { GSRSSubstance } from '../types'

const BASE_URL = 'https://gsrs.ncats.nih.gov/gsrs/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

interface GSRSName {
  name: string
  type: string
}

/**
 * Search GSRS (Global Substance Registration System)
 * GSRS is the FDA's substance registration system for UNII identifiers
 */
export async function searchGSRS(query: string, limit: number = 20): Promise<GSRSSubstance[]> {
  try {
    const url = `${BASE_URL}/substances/search?q=${encodeURIComponent(query)}&size=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []

    const data = await res.json()
    const substances = data.content || data.substances || []

    return substances.map((substance: Record<string, unknown>) => {
      const names = (substance.names as GSRSName[] | undefined) || []
      const primaryName = names.find(n => n.type === 'COMMON_NAME' || n.type === 'USAN') || names[0]

      return {
        unii: String(substance.uuid || substance.unii || ''),
        name: String(primaryName?.name || substance.name || ''),
        synonyms: names.map(n => String(n.name || '')).filter(Boolean),
        type: String(substance.type || 'CHEMICAL'),
        structure: parseStructure(substance.structure as Record<string, unknown> | undefined),
        url: `https://gsrs.ncats.nih.gov/gsrs/substances/${substance.uuid || substance.unii || ''}`,
      }
    }).filter((s: GSRSSubstance) => s.unii || s.name)
  } catch (error) {
    console.error('GSRS search error:', error)
    return []
  }
}

/**
 * Get GSRS substance by UNII
 */
export async function getGSRSByUNII(unii: string): Promise<GSRSSubstance | null> {
  try {
    const url = `${BASE_URL}/substances/${encodeURIComponent(unii)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null

    const substance = await res.json()
    const names = (substance.names as GSRSName[] | undefined) || []
    const primaryName = names.find(n => n.type === 'COMMON_NAME' || n.type === 'USAN') || names[0]

    return {
      unii: String(substance.uuid || substance.unii || ''),
      name: String(primaryName?.name || substance.name || ''),
      synonyms: names.map(n => String(n.name || '')).filter(Boolean),
      type: String(substance.type || 'CHEMICAL'),
      structure: parseStructure(substance.structure as Record<string, unknown> | undefined),
      url: `https://gsrs.ncats.nih.gov/gsrs/substances/${substance.uuid || substance.unii || ''}`,
    }
  } catch (error) {
    console.error('GSRS UNII fetch error:', error)
    return null
  }
}

function parseStructure(structure?: Record<string, unknown>): {
  smiles?: string
  inchi?: string
  inchiKey?: string
  formula?: string
  molecularWeight?: number
} {
  if (!structure) return {}

  return {
    smiles: String(structure.smiles || ''),
    inchi: String(structure.inchi || ''),
    inchiKey: String(structure.inchiKey || ''),
    formula: String(structure.molecularFormula || structure.formula || ''),
    molecularWeight: parseFloat(String(structure.molecularWeight || structure.molecular_mass || '0')) || undefined,
  }
}
