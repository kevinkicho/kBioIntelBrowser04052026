import type { CitationMetric } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getCitationMetrics(dois: string[]): Promise<CitationMetric[]> {
  try {
    const limited = dois.slice(0, 10)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (doi): Promise<CitationMetric | null> => {
        try {
          const url = `https://opencitations.net/index/coci/api/v1/citation-count/${doi}`
          const res = await fetch(url, fetchOptions)
          if (!res.ok) return null
          const data = await res.json()
          return {
            doi,
            title: '',
            citationCount: Number(data?.[0]?.count) || 0,
            citedBy: [],
            references: [],
            url: `https://doi.org/${doi}`,
          }
        } catch {
          return null
        }
      }),
    )
    return results.filter((r): r is CitationMetric => r !== null)
  } catch {
    return []
  }
}
