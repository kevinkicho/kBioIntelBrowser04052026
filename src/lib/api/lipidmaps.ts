// LIPID MAPS API Client
// https://www.lipidmaps.org/
// Standardized lipid nomenclature and structures (23K+ lipids)

const BASE_URL = 'https://www.lipidmaps.org/rest'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface LipidMapsLipid {
  lmId: string
  name: string
  synonyms: string[]
  category: string
  mainClass: string
  subClass: string
  formula: string
  molecularWeight: number
  exactMass: number
  smiles?: string
  inchi?: string
  inchiKey?: string
  url: string
}

export interface LipidMapsSearchResponse {
  lipids: LipidMapsLipid[]
  total: number
}

/**
 * Search LIPID MAPS by name or synonym
 */
export async function searchLipidMaps(query: string, limit = 20): Promise<LipidMapsSearchResponse> {
  try {
    const url = `${BASE_URL}/search?term=${encodeURIComponent(query)}&format=json&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('LIPID MAPS search failed')
    const data = await res.json()

    return {
      lipids: (data?.results ?? []).map((r: Record<string, unknown>) => ({
        lmId: (r.LM_ID as string) ?? '',
        name: (r.SYSTEMATIC_NAME as string) ?? (r.COMMON_NAME as string) ?? '',
        synonyms: [(r.COMMON_NAME as string), (r.SYNONYMS as string)].filter(Boolean).join('|').split('|'),
        category: (r.CATEGORY as string) ?? '',
        mainClass: (r.MAIN_CLASS as string) ?? '',
        subClass: (r.SUB_CLASS as string) ?? '',
        formula: (r.FORMULA as string) ?? '',
        molecularWeight: parseFloat(r.MOLECULAR_WEIGHT as string) || 0,
        exactMass: parseFloat(r.EXACT_MASS as string) || 0,
        smiles: (r.SMILES as string) ?? '',
        inchi: (r.INCHI as string) ?? '',
        inchiKey: (r.INCHI_KEY as string) ?? '',
        url: `https://www.lipidmaps.org/data/structure/${r.LM_ID}`,
      })),
      total: data?.total ?? 0,
    }
  } catch {
    return { lipids: [], total: 0 }
  }
}

/**
 * Get lipid by LIPID MAPS ID
 */
export async function getLipidMapsLipid(lmId: string): Promise<LipidMapsLipid | null> {
  try {
    const result = await searchLipidMaps(lmId, 1)
    return result.lipids[0] ?? null
  } catch {
    return null
  }
}

/**
 * Search lipids by formula
 */
export async function searchLipidsByFormula(formula: string): Promise<LipidMapsLipid[]> {
  try {
    const url = `${BASE_URL}/formula?term=${encodeURIComponent(formula)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data?.results ?? []).map((r: Record<string, unknown>) => ({
      lmId: (r.LM_ID as string) ?? '',
      name: (r.SYSTEMATIC_NAME as string) ?? (r.COMMON_NAME as string) ?? '',
      synonyms: [(r.COMMON_NAME as string), (r.SYNONYMS as string)].filter(Boolean).join('|').split('|'),
      category: (r.CATEGORY as string) ?? '',
      mainClass: (r.MAIN_CLASS as string) ?? '',
      subClass: (r.SUB_CLASS as string) ?? '',
      formula: (r.FORMULA as string) ?? '',
      molecularWeight: parseFloat(r.MOLECULAR_WEIGHT as string) || 0,
      exactMass: parseFloat(r.EXACT_MASS as string) || 0,
      smiles: (r.SMILES as string) ?? '',
      inchi: (r.INCHI as string) ?? '',
      inchiKey: (r.INCHI_KEY as string) ?? '',
      url: `https://www.lipidmaps.org/data/structure/${r.LM_ID}`,
    }))
  } catch {
    return []
  }
}

/**
 * Get lipids by category
 */
export async function getLipidsByCategory(category: string): Promise<LipidMapsLipid[]> {
  try {
    const url = `${BASE_URL}/category/${encodeURIComponent(category)}?format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data?.results ?? []).map((r: Record<string, unknown>) => ({
      lmId: (r.LM_ID as string) ?? '',
      name: (r.SYSTEMATIC_NAME as string) ?? (r.COMMON_NAME as string) ?? '',
      synonyms: [(r.COMMON_NAME as string), (r.SYNONYMS as string)].filter(Boolean).join('|').split('|'),
      category: (r.CATEGORY as string) ?? '',
      mainClass: (r.MAIN_CLASS as string) ?? '',
      subClass: (r.SUB_CLASS as string) ?? '',
      formula: (r.FORMULA as string) ?? '',
      molecularWeight: parseFloat(r.MOLECULAR_WEIGHT as string) || 0,
      exactMass: parseFloat(r.EXACT_MASS as string) || 0,
      smiles: (r.SMILES as string) ?? '',
      inchi: (r.INCHI as string) ?? '',
      inchiKey: (r.INCHI_KEY as string) ?? '',
      url: `https://www.lipidmaps.org/data/structure/${r.LM_ID}`,
    }))
  } catch {
    return []
  }
}
