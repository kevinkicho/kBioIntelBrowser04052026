import type { WikiPathway } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getWikiPathwaysByName(name: string): Promise<WikiPathway[]> {
  try {
    const url = `https://webservice.wikipathways.org/findPathwaysByText?query=${encodeURIComponent(name)}&species=Homo+sapiens&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const raw = data.result ?? []
    const results = Array.isArray(raw) ? raw : raw?.pathways ?? []
    return results
      .map((r: Record<string, unknown>) => {
        const ws = (r.ws ?? r) as Record<string, string>
        return {
          id: String(ws.id ?? ws.wpId ?? ws.wp_id ?? ''),
          name: String(ws.name ?? ws.title ?? ''),
          species: String(ws.species ?? ws.organism ?? 'Homo sapiens'),
          url: String(ws.url ?? `https://www.wikipathways.org/pathways/${ws.id ?? ws.wpId ?? ws.wp_id ?? ''}`),
        }
      })
      .filter((p: { id: string; name: string }) => p.id && p.name)
      .slice(0, 10)
  } catch {
    return []
  }
}
