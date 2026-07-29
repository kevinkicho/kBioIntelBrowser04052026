import type { WikiPathway } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getWikiPathwaysByName(name: string): Promise<WikiPathway[]> {
  try {
    const q = name?.trim()
    if (!q) return []

    // Legacy webservice.wikipathways.org often 404s; use bridgeDb + pathway index fallbacks.
    // Free Pathway Commons search as primary (JSON), then official WP REST if available.
    const pcUrl =
      `https://www.pathwaycommons.org/pc2/search.json?q=${encodeURIComponent(q)}` +
      `&type=pathway&organism=9606&page=0`
    const pcRes = await fetch(pcUrl, fetchOptions)
    if (pcRes.ok) {
      const data = await pcRes.json()
      const hits = (data.searchHit ?? data.searchHits ?? []) as Array<Record<string, unknown>>
      const wpish = hits
        .map((h) => {
          const uri = String(h.uri ?? h.uriId ?? '')
          const nameStr = String(h.name ?? h.displayName ?? '')
          const wpMatch = uri.match(/WP\d+/i) || nameStr.match(/WP\d+/i)
          const id = wpMatch ? String(wpMatch[0]).toUpperCase() : uri.split('/').pop() || ''
          return {
            id,
            name: nameStr || id,
            species: 'Homo sapiens',
            url: uri.startsWith('http')
              ? uri
              : id
                ? `https://www.wikipathways.org/pathways/${id}`
                : '',
          }
        })
        .filter((p) => p.id && p.name)
      if (wpish.length > 0) return wpish.slice(0, 10)
    }

    // Fallback: Reactome pathways API by name (still free, pathway-shaped)
    const rUrl = `https://reactome.org/ContentService/search/query?query=${encodeURIComponent(q)}&species=Homo%20sapiens&types=Pathway&cluster=true`
    const rRes = await fetch(rUrl, fetchOptions)
    if (rRes.ok) {
      const data = await rRes.json()
      const results = (data.results ?? []) as Array<{
        entries?: Array<{ stId?: string; name?: string }>
      }>
      const pathways: WikiPathway[] = []
      for (const block of results) {
        for (const e of block.entries ?? []) {
          if (!e.stId || !e.name) continue
          pathways.push({
            id: e.stId,
            name: e.name,
            species: 'Homo sapiens',
            url: `https://reactome.org/content/detail/${e.stId}`,
          })
        }
      }
      if (pathways.length > 0) return pathways.slice(0, 10)
    }

    return []
  } catch {
    return []
  }
}
