import type { ProteinAtlasEntry } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Protein Atlas harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing symbol, and unmatched JSON remain empty.
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

export async function getProteinAtlasBySymbols(symbols: string[]): Promise<ProteinAtlasEntry[]> {
  const limited = symbols.slice(0, 5)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (symbol): Promise<ProteinAtlasEntry | null> => {
      const res = await timedFetch(
        `https://www.proteinatlas.org/api/search_download.php?search=${encodeURIComponent(symbol)}&format=json&columns=g,t,scl,up&compress=no`,
        { ...fetchOptions, timeoutMs: 8000 },
      )
      if (isAbsentStatus(res.status)) return null
      throwIfHttpFailed(res, 'Protein Atlas')
      const data = await res.json()
      if (!Array.isArray(data)) return null
      const match = data.find((entry: Record<string, unknown>) => entry.Gene === symbol)
      if (!match) return null
      const uniprotArr = match.Uniprot
      return {
        gene: match.Gene ?? symbol,
        uniprotId: Array.isArray(uniprotArr) && uniprotArr.length > 0 ? String(uniprotArr[0]) : '',
        subcellularLocations: Array.isArray(match['Subcellular location']) ? match['Subcellular location'] : [],
        url: `https://www.proteinatlas.org/${match.Gene ?? symbol}`,
      }
    }),
  )

  const entries = results.filter((r): r is ProteinAtlasEntry => r !== null)
  const seen = new Set<string>()
  return entries.filter(e => {
    if (seen.has(e.gene)) return false
    seen.add(e.gene)
    return true
  })
}
