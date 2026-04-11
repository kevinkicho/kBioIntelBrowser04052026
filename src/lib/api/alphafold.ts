import type { AlphaFoldPrediction } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getAlphaFoldPredictions(accessions: string[]): Promise<AlphaFoldPrediction[]> {
  try {
    const limited = accessions.slice(0, 5)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (accession): Promise<AlphaFoldPrediction | null> => {
        try {
          const res = await fetch(
            `https://alphafold.ebi.ac.uk/api/prediction/${accession}`,
            fetchOptions,
          )
          if (!res.ok) return null
          const data = await res.json()
          const entry = Array.isArray(data) ? data[0] : data
          if (!entry) return null
          return {
            entryId: entry.entryId ?? '',
            uniprotAccession: entry.uniprotAccession ?? accession,
            geneName: entry.gene ?? '',
            organismName: entry.organismScientificName ?? '',
            confidenceScore: Number(entry.paeOverallScore ?? entry.globalMetricValue) || 0,
            modelUrl: entry.cifUrl ?? '',
            url: `https://alphafold.ebi.ac.uk/entry/${accession}`,
          }
        } catch {
          return null
        }
      }),
    )

    return results.filter((r): r is AlphaFoldPrediction => r !== null)
  } catch {
    return []
  }
}
