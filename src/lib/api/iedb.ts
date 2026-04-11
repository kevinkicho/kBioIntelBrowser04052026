import type { IEDBEpitope } from '../types'

const BASE_URL = 'https://www.iedb.org/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search IEDB for epitopes by antigen/protein name
 */
export async function searchEpitopes(query: string): Promise<IEDBEpitope[]> {
  try {
    // IEDB has a free API endpoint
    const url = `${BASE_URL}/epitopeSearch?search=${encodeURIComponent(query)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((result: Record<string, unknown>) => ({
      epitopeId: result.epitope_id as number ?? 0,
      name: result.epitope_name as string ?? '',
      sequence: result.epitope_sequence as string ?? '',
      length: result.length as number ?? 0,
      epitopeType: result.epitope_type as string ?? '',
      antigenName: result.antigen_name as string ?? '',
      antigenId: result.antigen_id as number ?? 0,
      organismName: result.source_organism as string ?? '',
      organismId: result.source_organism_id as number ?? 0,
      mhcRestriction: result.mhc_restriction as string ?? '',
      assayCount: result.assay_count as number ?? 0,
      positiveAssayCount: result.positive_count as number ?? 0,
      source: 'IEDB',
      url: `https://www.iedb.org/epitope/${result.epitope_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Search B cell epitopes by protein
 */
export async function searchBEpitopes(proteinName: string): Promise<IEDBEpitope[]> {
  try {
    const url = `${BASE_URL}/bcellSearch?protein=${encodeURIComponent(proteinName)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((result: Record<string, unknown>) => ({
      epitopeId: result.epitope_id as number ?? 0,
      name: result.epitope_name as string ?? '',
      sequence: result.sequence as string ?? '',
      length: (result.sequence as string)?.length ?? 0,
      epitopeType: 'B cell',
      antigenName: result.protein_name as string ?? '',
      antigenId: result.protein_id as number ?? 0,
      organismName: result.organism as string ?? '',
      organismId: result.organism_id as number ?? 0,
      mhcRestriction: '',
      assayCount: result.assay_count as number ?? 0,
      positiveAssayCount: result.positive_count as number ?? 0,
      source: 'IEDB',
      url: `https://www.iedb.org/epitope/${result.epitope_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Search T cell epitopes by protein
 */
export async function searchTEpitopes(proteinName: string): Promise<IEDBEpitope[]> {
  try {
    const url = `${BASE_URL}/tcellSearch?protein=${encodeURIComponent(proteinName)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((result: Record<string, unknown>) => ({
      epitopeId: result.epitope_id as number ?? 0,
      name: result.epitope_name as string ?? '',
      sequence: result.sequence as string ?? '',
      length: (result.sequence as string)?.length ?? 0,
      epitopeType: 'T cell',
      antigenName: result.protein_name as string ?? '',
      antigenId: result.protein_id as number ?? 0,
      organismName: result.organism as string ?? '',
      organismId: result.organism_id as number ?? 0,
      mhcRestriction: result.mhc_allele as string ?? '',
      assayCount: result.assay_count as number ?? 0,
      positiveAssayCount: result.positive_count as number ?? 0,
      source: 'IEDB',
      url: `https://www.iedb.org/epitope/${result.epitope_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Main export: Get IEDB epitope data for a protein/antigen name
 */
export async function getIEDBData(proteinName: string): Promise<{
  epitopes: IEDBEpitope[]
}> {
  const [allEpitopes, bEpitopes, tEpitopes] = await Promise.all([
    searchEpitopes(proteinName),
    searchBEpitopes(proteinName),
    searchTEpitopes(proteinName)
  ])

  // Combine and deduplicate
  const combined = [...allEpitopes, ...bEpitopes, ...tEpitopes]
  const seen = new Set<number>()
  const unique = combined.filter(e => {
    if (seen.has(e.epitopeId)) return false
    seen.add(e.epitopeId)
    return true
  })

  return {
    epitopes: unique.slice(0, 25)
  }
}