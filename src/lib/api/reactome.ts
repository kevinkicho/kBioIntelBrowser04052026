import type { ReactomePathway } from '../types'
import { stripHtml } from '../utils'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://reactome.org/ContentService/search/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Reactome harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

export async function getReactomePathwaysByName(name: string): Promise<ReactomePathway[]> {
  const url = `${BASE_URL}?query=${encodeURIComponent(name)}&types=Pathway&species=Homo+sapiens&cluster=true`
  const res = await timedFetch(url, {
    headers: { Accept: 'application/json' },
    ...fetchOptions,
    timeoutMs: 8000,
  })
  throwIfHttpFailed(res, 'Reactome')
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
    summation: stripHtml(entry.summation ?? ''),
    url: `https://reactome.org/content/detail/${entry.stId ?? ''}`,
  }))
}
