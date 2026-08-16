import type { EnsemblGene } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Ensembl harvest leaf. HTTP 5xx / HTML / timeout are not EMPTY.
 * 400/404 on a symbol is a true miss (unknown gene) and is skipped.
 * True zero-hit remains [].
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

function isUnknownSymbol(res: Response): boolean {
  return res.status === 400 || res.status === 404
}

export async function getEnsemblGenesBySymbols(symbols: string[]): Promise<EnsemblGene[]> {
  const limited = symbols.slice(0, 5)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (symbol): Promise<EnsemblGene | null> => {
      const res = await timedFetch(
        `https://rest.ensembl.org/lookup/symbol/homo_sapiens/${encodeURIComponent(symbol)}?content-type=application/json`,
        { ...fetchOptions, timeoutMs: 8000 },
      )
      if (isUnknownSymbol(res)) return null
      throwIfHttpFailed(res, 'Ensembl')
      const data = await res.json()
      if (!data) return null
      const geneId = data.id ?? ''
      return {
        geneId,
        symbol: data.display_name ?? '',
        name: data.description ?? data.display_name ?? '',
        displayName: data.display_name ?? '',
        description: data.description ?? '',
        biotype: data.biotype ?? '',
        chromosome: data.seq_region_name ?? '',
        start: Number(data.start) || 0,
        end: Number(data.end) || 0,
        strand: Number(data.strand) || 0,
        url: `https://ensembl.org/Homo_sapiens/Gene/Summary?g=${geneId}`,
      }
    }),
  )

  return results.filter((r): r is EnsemblGene => r !== null)
}
