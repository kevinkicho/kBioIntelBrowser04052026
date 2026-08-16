import type { GoAnnotation } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * QuickGO harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getGoAnnotationsByAccessions(accessions: string[]): Promise<GoAnnotation[]> {
  const limited = accessions.slice(0, 5)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (accession): Promise<GoAnnotation[]> => {
      const res = await timedFetch(
        `https://www.ebi.ac.uk/QuickGO/services/annotation/search?geneProductId=${encodeURIComponent(accession)}&limit=20`,
        {
          ...fetchOptions,
          headers: { Accept: 'application/json' },
          timeoutMs: 8000,
        },
      )
      throwIfHttpFailed(res, 'QuickGO')
      const data = await res.json()
      const items = data?.results ?? []
      return (items as Record<string, string>[]).map(item => ({
        goId: item.goId ?? '',
        goName: item.goName ?? item.goId ?? '',
        goAspect: item.goAspect ?? '',
        evidence: item.goEvidence ?? '',
        qualifier: item.qualifier ?? '',
        url: `https://www.ebi.ac.uk/QuickGO/term/${item.goId}`,
      }))
    }),
  )

  const all = results.flat()
  const seen = new Set<string>()
  const deduped: GoAnnotation[] = []
  for (const a of all) {
    if (seen.has(a.goId)) continue
    seen.add(a.goId)
    deduped.push(a)
    if (deduped.length >= 20) break
  }
  return deduped
}
