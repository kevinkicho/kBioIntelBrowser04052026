import type { GeneInfo } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getGeneInfoByName(name: string): Promise<GeneInfo[]> {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${encodeURIComponent(name)}+AND+Homo+sapiens[Organism]&retmode=json&retmax=${LIMITS.NCBI_GENE.initial}`,
      fetchOptions,
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const ids: string[] = searchData?.esearchresult?.idlist ?? []
    if (ids.length === 0) return []

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${ids.join(',')}&retmode=json`,
      fetchOptions,
    )
    if (!summaryRes.ok) return []
    const summaryData = await summaryRes.json()
    const resultObj = summaryData?.result ?? {}

    return ids
      .map((id): GeneInfo | null => {
        const entry = resultObj[id]
        if (!entry) return null
        return {
          geneId: id,
          symbol: entry.Name ?? entry.name ?? '',
          name: entry.Description ?? entry.description ?? '',
          summary: entry.Summary ?? entry.summary ?? '',
          chromosome: entry.Chromosome ?? entry.chromosome ?? '',
          mapLocation: entry.MapLocation ?? entry.maplocation ?? '',
          organism: entry.Organism?.ScientificName ?? entry.organism?.scientificname ?? entry.organism?.ScientificName ?? '',
          url: `https://www.ncbi.nlm.nih.gov/gene/${id}`,
        }
      })
      .filter((g): g is GeneInfo => g !== null)
  } catch {
    return []
  }
}
