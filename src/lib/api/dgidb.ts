import type { DrugGeneInteraction } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getDrugGeneInteractionsByName(name: string): Promise<DrugGeneInteraction[]> {
  try {
    const url = `https://dgidb.org/api/v2/interactions.json?drugs=${encodeURIComponent(name)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const matchedTerms = data?.matchedTerms ?? []
    if (matchedTerms.length === 0) return []

    const interactions = matchedTerms[0]?.interactions ?? []
    return interactions.slice(0, 10).map((i: Record<string, unknown>) => ({
      geneName: (i.geneName as string) ?? '',
      interactionType: (i.interactionTypes as string[])?.join(', ') ?? '',
      source: ((i.sources as string[]) ?? []).join(', '),
      score: Number(i.score) || 0,
      url: `https://dgidb.org/genes/${encodeURIComponent((i.geneName as string) ?? '')}`,
    }))
  } catch {
    return []
  }
}
