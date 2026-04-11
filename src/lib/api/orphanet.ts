import type { OrphanetDisease } from '../types'

const BASE_URL = 'https://api.orphadata.com'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search Orphanet diseases by name
 */
export async function searchOrphanetDiseases(name: string): Promise<OrphanetDisease[]> {
  try {
    // Orphadata API endpoint for rare disease search
    const url = `${BASE_URL}/rd/orphacommercializedproducts?search=${encodeURIComponent(name)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: Record<string, unknown>) => ({
      orphaCode: item.ORPHAcode as string,
      diseaseName: item.PreferredTerm as string,
      diseaseType: item.DisorderType as string,
      definition: item.Definition ?? '',
      synonyms: (item.SynonymList ?? []) as string[],
      genes: [],
      symptoms: [],
      prevalence: (item.PrevalenceList as Record<string, unknown>[] | undefined)?.[0]?.PrevalenceClass as string ?? '',
      url: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert=${item.ORPHAcode}`
    }))
  } catch {
    return []
  }
}

/**
 * Get disease details by ORPHA code
 */
export async function getOrphanetDiseaseByCode(orphaCode: string): Promise<OrphanetDisease | null> {
  try {
    const url = `${BASE_URL}/rd/orphacommercializedproducts/${orphaCode}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    if (!data.data) return null

    const item = data.data
    return {
      orphaCode: item.ORPHAcode as string,
      diseaseName: item.PreferredTerm as string,
      diseaseType: item.DisorderType as string,
      definition: item.Definition ?? '',
      synonyms: (item.SynonymList ?? []) as string[],
      genes: (item.GeneList ?? []) as string[],
      symptoms: (item.HPOList ?? []).map((h: Record<string, unknown>) => h.HPOName as string),
      prevalence: (item.PrevalenceList as Record<string, unknown>[] | undefined)?.[0]?.PrevalenceClass as string ?? '',
      url: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert=${item.ORPHAcode}`
    }
  } catch {
    return null
  }
}

/**
 * Get associated genes for a disease
 */
export async function getOrphanetGenes(orphaCode: string): Promise<string[]> {
  try {
    const url = `${BASE_URL}/rd/orphacommercializedproducts/${orphaCode}/genes`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.data ?? []).map((g: Record<string, unknown>) => g.Symbol as string).slice(0, 20)
  } catch {
    return []
  }
}

/**
 * Main export: Get Orphanet data for a molecule name
 */
export async function getOrphanetData(name: string): Promise<{
  diseases: OrphanetDisease[]
}> {
  const diseases = await searchOrphanetDiseases(name)

  return {
    diseases: diseases.slice(0, 15)
  }
}