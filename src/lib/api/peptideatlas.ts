import type { PeptideAtlasEntry } from '../types'

const BASE_URL = 'https://www.peptideatlas.org/api'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search PeptideAtlas for peptides by protein or gene name
 */
export async function searchPeptides(query: string): Promise<PeptideAtlasEntry[]> {
  try {
    // PeptideAtlas has REST API endpoints
    const url = `${BASE_URL}/peptide_search.php?query=${encodeURIComponent(query)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.peptides ?? []).map((peptide: Record<string, unknown>) => ({
      peptideId: peptide.peptide_id as string ?? '',
      sequence: peptide.sequence as string ?? '',
      length: (peptide.sequence as string)?.length ?? 0,
      proteinNames: (peptide.proteins as string ?? '').split(';').slice(0, 5),
      geneSymbols: (peptide.genes as string ?? '').split(';').slice(0, 5),
      organism: peptide.organism as string ?? 'Homo sapiens',
      tissueSource: peptide.tissue as string ?? '',
      sampleSource: peptide.sample_type as string ?? '',
      observations: peptide.observations as number ?? 0,
      bestScore: peptide.best_score as number ?? 0,
      source: 'PeptideAtlas',
      url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Get peptides for a specific protein accession
 */
export async function getPeptidesByProtein(proteinAccession: string): Promise<PeptideAtlasEntry[]> {
  try {
    const url = `${BASE_URL}/protein_peptides.php?protein=${encodeURIComponent(proteinAccession)}&limit=50`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.peptides ?? []).map((peptide: Record<string, unknown>) => ({
      peptideId: peptide.peptide_id as string ?? '',
      sequence: peptide.sequence as string ?? '',
      length: (peptide.sequence as string)?.length ?? 0,
      proteinNames: [proteinAccession],
      geneSymbols: (peptide.genes as string ?? '').split(';').slice(0, 5),
      organism: peptide.organism as string ?? 'Homo sapiens',
      tissueSource: peptide.tissue as string ?? '',
      sampleSource: peptide.sample_type as string ?? '',
      observations: peptide.observations as number ?? 0,
      bestScore: peptide.best_score as number ?? 0,
      source: 'PeptideAtlas',
      url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Get peptides by tissue type
 */
export async function getPeptidesByTissue(tissue: string): Promise<PeptideAtlasEntry[]> {
  try {
    const url = `${BASE_URL}/tissue_peptides.php?tissue=${encodeURIComponent(tissue)}&limit=30`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.peptides ?? []).slice(0, 30).map((peptide: Record<string, unknown>) => ({
      peptideId: peptide.peptide_id as string ?? '',
      sequence: peptide.sequence as string ?? '',
      length: (peptide.sequence as string)?.length ?? 0,
      proteinNames: (peptide.proteins as string ?? '').split(';').slice(0, 5),
      geneSymbols: (peptide.genes as string ?? '').split(';').slice(0, 5),
      organism: peptide.organism as string ?? 'Homo sapiens',
      tissueSource: tissue,
      sampleSource: peptide.sample_type as string ?? '',
      observations: peptide.observations as number ?? 0,
      bestScore: peptide.best_score as number ?? 0,
      source: 'PeptideAtlas',
      url: `https://www.peptideatlas.org/peptide/${peptide.peptide_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Main export: Get PeptideAtlas data for a query
 */
export async function getPeptideAtlasData(query: string): Promise<{
  peptides: PeptideAtlasEntry[]
}> {
  const peptides = await searchPeptides(query)

  return {
    peptides: peptides.slice(0, 20)
  }
}