import type { GeneExpression } from '../types'

const fetchOptions: RequestInit = { cache: 'no-store' }

export async function getGeneExpressionBySymbols(symbols: string[]): Promise<GeneExpression[]> {
  try {
    const limited = symbols.slice(0, 3)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (symbol): Promise<GeneExpression[]> => {
        try {
          const res = await fetch(
            `https://www.ebi.ac.uk/gxa/json/experiments?geneQuery=${encodeURIComponent(symbol)}`,
            fetchOptions,
          )
          if (!res.ok) return []
          const data = await res.json()
          const experiments = ((data.experiments ?? []) as Record<string, string>[]).slice(0, 20)
          return experiments.map(e => ({
            geneSymbol: symbol,
            tissueName: '',
            expressionLevel: 0,
            unit: '',
            condition: '',
            experimentType: e.experimentType ?? '',
            experimentDescription: e.experimentDescription ?? '',
            species: e.species ?? '',
            url: `https://www.ebi.ac.uk/gxa/experiments/${e.experimentAccession}`,
          }))
        } catch {
          return []
        }
      }),
    )

    const all = results.flat()
    const seen = new Set<string>()
    return all.filter(e => {
      if (seen.has(e.url)) return false
      seen.add(e.url)
      return true
    })
  } catch {
    return []
  }
}