import type { PathwayCommonsResult } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPathwayCommonsByName(name: string): Promise<PathwayCommonsResult[]> {
  try {
    const url = `https://www.pathwaycommons.org/pc2/search?q=${encodeURIComponent(name)}&type=Pathway&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return ((data.searchHit ?? []) as Record<string, unknown>[]).slice(0, 10).map((r) => {
      const uri = (r.uri as string) ?? ''
      const dataSources = Array.isArray(r.dataSource) ? (r.dataSource as string[]).join(', ') : (r.dataSource as string) ?? ''
      return {
        pathwayId: uri,
        pathwayName: (r.name as string) ?? '',
        source: dataSources,
        interactions: Number(r.numParticipants) || 0,
        participants: [],
        dataSource: dataSources,
        name: (r.name as string) ?? '',
        numParticipants: Number(r.numParticipants) || 0,
        url: uri.startsWith('http') ? uri : `https://www.pathwaycommons.org/pc2/${uri}`,
      }
    })
  } catch {
    return []
  }
}
