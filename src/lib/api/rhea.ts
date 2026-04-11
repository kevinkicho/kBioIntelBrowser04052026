import type { SynthesisRoute } from '../types'

const BASE_URL = 'https://www.rhea-db.org/rhea'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getRheaSynthesisRoutes(moleculeName: string): Promise<SynthesisRoute[]> {
  try {
    const query = encodeURIComponent(moleculeName)
    const res = await fetch(
      `${BASE_URL}?query=${query}&columns=rhea-id,equation,enzymes&format=json&limit=5`,
      fetchOptions
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((r: {
      rheaId: string
      equation: string
      enzymes?: { name: string }[]
    }) => ({
      method: `Enzymatic reaction ${r.rheaId}`,
      description: r.equation ?? '',
      keggReactionIds: [],
      enzymesInvolved: (r.enzymes ?? []).map((e: { name: string }) => e.name),
      precursors: [],
      source: 'rhea' as const,
    }))
  } catch {
    return []
  }
}
