import type { ProteinAtlasEntry } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getProteinAtlasBySymbols(symbols: string[]): Promise<ProteinAtlasEntry[]> {
  try {
    const limited = symbols.slice(0, 5)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (symbol): Promise<ProteinAtlasEntry | null> => {
        try {
          const res = await fetch(
            `https://www.proteinatlas.org/api/search_download.php?search=${encodeURIComponent(symbol)}&format=json&columns=g,t,scl,up&compress=no`,
            fetchOptions,
          )
          if (!res.ok) return null
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
        } catch {
          return null
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
  } catch {
    return []
  }
}
