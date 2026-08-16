import type { MonarchDisease } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Monarch harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getMonarchDiseasesByName(name: string): Promise<MonarchDisease[]> {
  // v3 API path is /v3/api/search (not /v3/search)
  const res = await timedFetch(
    `https://api.monarchinitiative.org/v3/api/search?q=${encodeURIComponent(name)}&limit=10&category=biolink:Disease`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  throwIfHttpFailed(res, 'Monarch')
  const data = await res.json()
  const items = data.items ?? data.results ?? []
  return items.slice(0, 10).map((item: {
    id?: string
    name?: string
    description?: string
    category?: string[]
    has_phenotype_count?: number
  }) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    category: Array.isArray(item.category) ? item.category[0] ?? '' : String(item.category ?? ''),
    phenotypeCount: Number(item.has_phenotype_count) || 0,
    url: `https://monarchinitiative.org/${item.id}`,
  }))
}
