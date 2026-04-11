import type { GoAnnotation } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getGoAnnotationsByAccessions(accessions: string[]): Promise<GoAnnotation[]> {
  try {
    const limited = accessions.slice(0, 5)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (accession): Promise<GoAnnotation[]> => {
        try {
          const res = await fetch(
            `https://www.ebi.ac.uk/QuickGO/services/annotation/search?geneProductId=${encodeURIComponent(accession)}&limit=20`,
            {
              ...fetchOptions,
              headers: { Accept: 'application/json' },
            },
          )
          if (!res.ok) return []
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
        } catch {
          return []
        }
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
  } catch {
    return []
  }
}
