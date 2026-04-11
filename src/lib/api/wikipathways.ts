import type { WikiPathway } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getWikiPathwaysByName(name: string): Promise<WikiPathway[]> {
  try {
    const url = `https://webservice.wikipathways.org/findPathwaysByText?query=${encodeURIComponent(name)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const results = (data.result ?? []) as Record<string, string>[]
    return results
      .map(r => ({
        id: r.id ?? '',
        name: r.name ?? '',
        species: r.species ?? '',
        url: `https://www.wikipathways.org/pathways/${r.id}`,
      }))
      .filter(p => p.species === 'Homo sapiens')
      .slice(0, 10)
  } catch {
    return []
  }
}
