import type { ChemicalProteinInteraction } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getChemicalInteractionsByName(name: string, limit: number = LIMITS.STITCH.initial): Promise<ChemicalProteinInteraction[]> {
  try {
    const identifiers = encodeURIComponent(name)
    const url = `https://stitch.embl.de/api/json/interactionPartners?identifiers=${identifiers}&species=9606&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    return (data as Record<string, string>[]).slice(0, limit).map(r => ({
      chemicalId: r.chemicalId ?? r.stringId_A ?? r.queryItem ?? '',
      chemicalName: r.chemicalName ?? r.preferredName_A ?? r.queryName ?? '',
      proteinId: r.stringId_B ?? r.proteinId ?? '',
      proteinName: r.preferredName_B ?? r.proteinName ?? '',
      combinedScore: Number(r.score) || 0,
      experimentalScore: Number(r.escore) || 0,
      databaseScore: Number(r.dscore) || 0,
      textminingScore: Number(r.tscore) || 0,
      url: `https://stitch.embl.de/network/${r.chemicalId ?? r.stringId_A ?? r.queryItem ?? ''}`,
    }))
  } catch {
    return []
  }
}