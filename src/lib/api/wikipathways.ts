import type { WikiPathway } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * WikiPathways harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404, and zero-hit JSON remain empty.
 * Pathway Commons may fall through to Reactome; if the fallback also fails, throw.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function mapPcHits(data: Record<string, unknown>): WikiPathway[] {
  const hits = (data.searchHit ?? data.searchHits ?? []) as Array<Record<string, unknown>>
  return hits
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
    .filter((row) => row.id && row.name)
}

function mapReactome(data: Record<string, unknown>): WikiPathway[] {
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
  return pathways
}

export async function getWikiPathwaysByName(name: string): Promise<WikiPathway[]> {
  const q = name?.trim()
  if (!q) return []

  // Legacy webservice.wikipathways.org often 404s; use Pathway Commons then Reactome.
  const pcUrl =
    `https://www.pathwaycommons.org/pc2/search.json?q=${encodeURIComponent(q)}` +
    `&type=pathway&organism=9606&page=0`
  try {
    const pcRes = await timedFetch(pcUrl, { ...fetchOptions, timeoutMs: 8000 })
    if (pcRes.ok) {
      throwIfHttpFailed(pcRes, 'Pathway Commons')
      const mapped = mapPcHits(await pcRes.json())
      if (mapped.length > 0) return mapped.slice(0, 10)
    }
    // 404 / 5xx / zero-hit: Reactome fallback
  } catch {
    // HTML / network / timeout: still try Reactome
  }

  const rUrl = `https://reactome.org/ContentService/search/query?query=${encodeURIComponent(q)}&species=Homo%20sapiens&types=Pathway&cluster=true`
  const rRes = await timedFetch(rUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(rRes.status)) return []
  throwIfHttpFailed(rRes, 'Reactome')
  return mapReactome(await rRes.json()).slice(0, 10)
}
