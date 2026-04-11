import type { EnsemblGene } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getEnsemblGenesBySymbols(symbols: string[]): Promise<EnsemblGene[]> {
  try {
    const limited = symbols.slice(0, 5)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (symbol): Promise<EnsemblGene | null> => {
        try {
          const res = await fetch(
            `https://rest.ensembl.org/lookup/symbol/homo_sapiens/${encodeURIComponent(symbol)}?content-type=application/json`,
            fetchOptions,
          )
          if (!res.ok) return null
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
        } catch {
          return null
        }
      }),
    )

    return results.filter((r): r is EnsemblGene => r !== null)
  } catch {
    return []
  }
}
