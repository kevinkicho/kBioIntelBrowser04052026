import type { ChemicalProteinInteraction } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getChemicalInteractionsByName(name: string, limit: number = LIMITS.STITCH.initial): Promise<ChemicalProteinInteraction[]> {
  try {
    const url = `https://stitch.embl.de/api/json/interactionsList?identifiers=${encodeURIComponent(name)}&species=9606&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data as Record<string, string>[]).map(r => ({
      chemicalId: r.stringId_A ?? '',
      chemicalName: r.preferredName_A ?? '',
      proteinId: r.stringId_B ?? '',
      proteinName: r.preferredName_B ?? '',
      combinedScore: Number(r.score) || 0,
      experimentalScore: Number(r.escore) || 0,
      databaseScore: Number(r.dscore) || 0,
      textminingScore: Number(r.tscore) || 0,
      url: `https://stitch.embl.de/network/${r.stringId_A ?? ''}`,
    }))
  } catch {
    return []
  }
}