import type { PathwayCommonsResult } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Pathway Commons harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
 */
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

export async function getPathwayCommonsByName(name: string): Promise<PathwayCommonsResult[]> {
  const q = (name || '').trim()
  if (!q) return []

  const url = `https://www.pathwaycommons.org/pc2/search?q=${encodeURIComponent(q)}&type=Pathway&format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'Pathway Commons')
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
}
