import type { StringInteraction } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getProteinInteractionsByName(name: string, limit: number = LIMITS.STRING.initial): Promise<StringInteraction[]> {
  try {
    const url = `https://string-db.org/api/json/interaction_partners?identifiers=${encodeURIComponent(name)}&species=9606&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data as Record<string, string>[]).map(r => ({
      proteinA: r.preferredName_A ?? '',
      proteinB: r.preferredName_B ?? '',
      score: Number(r.score) || 0,
      experimentalScore: Number(r.escore) || 0,
      databaseScore: Number(r.dscore) || 0,
      textminingScore: Number(r.tscore) || 0,
      url: `https://string-db.org/network/${r.stringId_A}`,
    }))
  } catch {
    return []
  }
}