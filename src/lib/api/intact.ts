import type { MolecularInteraction } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getMolecularInteractionsByName(name: string): Promise<MolecularInteraction[]> {
  try {
    const url = `https://www.ebi.ac.uk/intact/ws/interaction/findInteractor/${encodeURIComponent(name)}?format=json&pageSize=10`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const entries = data?.content ?? data?.data ?? (Array.isArray(data) ? data : [])
    if (!Array.isArray(entries)) return []

    return entries.map((entry: Record<string, unknown>) => {
      const interactorA = (entry as Record<string, Record<string, string>>).interactorA ?? {}
      const interactorB = (entry as Record<string, Record<string, string>>).interactorB ?? {}
      const id = (entry.ac as string) ?? (entry.interactionAc as string) ?? ''
      const nameA = interactorA?.interactorName ?? interactorA?.name ?? ''
      const nameB = interactorB?.interactorName ?? interactorB?.name ?? ''
      return {
        interactionId: id,
        proteinA: nameA,
        proteinB: nameB,
        interactorA: nameA,
        interactorB: nameB,
        interactionType: (entry.interactionType as string) ?? '',
        detectionMethod: (entry.detectionMethod as string) ?? '',
        pubmedId: (entry.pubmedId as string) ?? '',
        confidenceScore: Number(entry.confidenceScore ?? entry.miscore) || 0,
        url: `https://www.ebi.ac.uk/intact/details/interaction/${id}`,
      }
    })
  } catch {
    return []
  }
}
