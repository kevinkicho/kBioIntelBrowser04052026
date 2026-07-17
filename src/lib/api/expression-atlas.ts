import type { GeneExpression } from '../types'

const fetchOptions: RequestInit = { cache: 'no-store' }

function isHumanSpecies(species: string | undefined): boolean {
  if (!species) return false
  const s = species.toLowerCase()
  return s.includes('homo sapiens') || s === 'human' || s.includes('h. sapiens')
}

/**
 * Expression Atlas experiments for gene symbols.
 * Filters to Homo sapiens — unfiltered geneQuery returns plant/animal hits for shared symbols (e.g. RPSA).
 */
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
          const experiments = (data.experiments ?? []) as Array<Record<string, string>>

          // Prefer human; keep a small non-human tail only if zero human hits
          const human = experiments.filter((e) => isHumanSpecies(e.species))
          const chosen = (human.length > 0 ? human : experiments).slice(0, 20)

          return chosen.map((e) => ({
            geneSymbol: symbol,
            tissueName: '',
            expressionLevel: 0,
            unit: '',
            condition: e.experimentType ?? '',
            experimentType: e.experimentType ?? '',
            experimentDescription: e.experimentDescription ?? e.experimentAccession ?? '',
            species: e.species ?? '',
            url: e.experimentAccession
              ? `https://www.ebi.ac.uk/gxa/experiments/${e.experimentAccession}`
              : 'https://www.ebi.ac.uk/gxa/',
          }))
        } catch {
          return []
        }
      }),
    )

    const all = results.flat()
    const seen = new Set<string>()
    return all.filter((e) => {
      if (!e.url || seen.has(e.url)) return false
      seen.add(e.url)
      return true
    })
  } catch {
    return []
  }
}
