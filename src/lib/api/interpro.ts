import type { ProteinDomain } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * InterPro harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getProteinDomains(accessions: string[]): Promise<ProteinDomain[]> {
  const limited = accessions.slice(0, 5)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (accession): Promise<ProteinDomain[]> => {
      const res = await timedFetch(
        `https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/UniProt/${encodeURIComponent(accession)}?page_size=10`,
        { ...fetchOptions, timeoutMs: 8000 },
      )
      throwIfHttpFailed(res, 'InterPro')
      const data = await res.json()
      const entries = data?.results ?? []
      return (entries as Record<string, Record<string, string>>[]).map(entry => {
        const meta = entry.metadata ?? {}
        const acc = meta.accession ?? ''
        return {
          domainId: acc,
          domainName: meta.name ?? '',
          name: meta.name ?? '',
          type: meta.type ?? '',
          description: meta.name ?? '',
          start: 0,
          end: 0,
          source: 'InterPro',
          url: `https://www.ebi.ac.uk/interpro/entry/InterPro/${acc}`,
        }
      })
    }),
  )

  return results.flat()
}
