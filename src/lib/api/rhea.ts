import type { SynthesisRoute } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.rhea-db.org/rhea'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Rhea harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains [].
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

export async function getRheaSynthesisRoutes(moleculeName: string): Promise<SynthesisRoute[]> {
  const query = encodeURIComponent(moleculeName)
  const res = await timedFetch(
    `${BASE_URL}?query=${query}&columns=rhea-id,equation,enzymes&format=json&limit=5`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'Rhea')
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
}
