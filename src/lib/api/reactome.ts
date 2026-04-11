import type { ReactomePathway } from '../types'

const BASE_URL = 'https://reactome.org/ContentService/search/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getReactomePathwaysByName(name: string): Promise<ReactomePathway[]> {
  try {
    const url = `${BASE_URL}?query=${encodeURIComponent(name)}&types=Pathway&species=Homo+sapiens&cluster=true`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...fetchOptions,
    })
    if (!res.ok) return []
    const data = await res.json()

    const pathwayGroup = (data.results ?? []).find(
      (g: { typeName?: string }) => g.typeName === 'Pathway'
    )
    if (!pathwayGroup) return []

    return (pathwayGroup.entries ?? []).slice(0, 10).map((entry: {
      stId?: string
      name?: string
      species?: string
      summation?: string
    }) => ({
      stId: entry.stId ?? '',
      name: entry.name ?? '',
      species: entry.species ?? 'Homo sapiens',
      summation: entry.summation ?? '',
      url: `https://reactome.org/content/detail/${entry.stId ?? ''}`,
    }))
  } catch {
    return []
  }
}
