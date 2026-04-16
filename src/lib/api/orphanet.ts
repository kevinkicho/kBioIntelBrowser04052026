import type { OrphanetDisease } from '../types'

const BASE_URL = 'https://api.orphadata.com'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

export async function searchOrphanetDiseases(name: string): Promise<OrphanetDisease[]> {
  try {
    const url = `${BASE_URL}/rd-cross-referencing/orphacodes/names/${encodeURIComponent(name)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const results = data.data ?? data.results ?? (Array.isArray(data) ? data : [])
    const items = Array.isArray(results) ? results : [results]

    return items.slice(0, 20).map((item: Record<string, unknown>) => ({
      orphaCode: String(item.ORPHAcode ?? item.orphacode ?? item.orphaCode ?? ''),
      diseaseName: String(item.PreferredTerm ?? item.preferredTerm ?? item.DiseaseName ?? item.name ?? ''),
      diseaseType: String(item.DisorderType ?? item.disorderType ?? item.DiseaseType ?? 'Rare disease'),
      definition: String(item.Definition ?? item.definition ?? ''),
      synonyms: Array.isArray(item.SynonymList) ? item.SynonymList as string[] : (Array.isArray(item.Synonyms) ? item.Synonyms as string[] : []),
      genes: [],
      symptoms: [],
      prevalence: '',
      url: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert=${item.ORPHAcode ?? item.orphacode ?? ''}`,
    }))
  } catch {
    return []
  }
}

export async function getOrphanetDiseaseByCode(orphaCode: string): Promise<OrphanetDisease | null> {
  try {
    const url = `${BASE_URL}/rd-phenotypes/orphacodes/${orphaCode}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const item = data.data ?? data
    if (!item) return null

    const phenotypes = Array.isArray(item.HPOList) ? item.HPOList as Record<string, unknown>[] : []
    const prevalenceList = Array.isArray(item.PrevalenceList) ? item.PrevalenceList as Record<string, unknown>[] : []

    return {
      orphaCode: String(item.ORPHAcode ?? item.orphacode ?? orphaCode),
      diseaseName: String(item.PreferredTerm ?? item.preferredTerm ?? ''),
      diseaseType: String(item.DisorderType ?? item.disorderType ?? 'Rare disease'),
      definition: String(item.Definition ?? item.definition ?? ''),
      synonyms: Array.isArray(item.SynonymList) ? item.SynonymList as string[] : [],
      genes: [],
      symptoms: phenotypes.map((h: Record<string, unknown>) => String(h.HPOName ?? h.name ?? '')).filter(Boolean),
      prevalence: prevalenceList[0]?.PrevalenceClass as string ?? prevalenceList[0]?.prevalenceClass as string ?? '',
      url: `https://www.orpha.net/consor/cgi-bin/OC_Exp.php?lng=en&Expert=${orphaCode}`,
    }
  } catch {
    return null
  }
}

export async function getOrphanetGenes(orphaCode: string): Promise<string[]> {
  try {
    const url = `${BASE_URL}/rd-associated-genes/orphacodes/${orphaCode}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const results = data.data ?? data.results ?? []
    return (Array.isArray(results) ? results : [results])
      .map((g: Record<string, unknown>) => String(g.Symbol ?? g.symbol ?? g.name ?? ''))
      .filter(Boolean)
      .slice(0, 20)
  } catch {
    return []
  }
}

export async function getOrphanetData(name: string): Promise<{
  diseases: OrphanetDisease[]
}> {
  const diseases = await searchOrphanetDiseases(name)

  return {
    diseases: diseases.slice(0, 15)
  }
}