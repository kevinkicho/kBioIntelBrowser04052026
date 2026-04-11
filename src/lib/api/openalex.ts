import type { OpenAlexWork } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getOpenAlexWorksByName(name: string): Promise<OpenAlexWork[]> {
  try {
    const url = `https://api.openalex.org/works?filter=title.search:${encodeURIComponent(name)}&per_page=10&sort=cited_by_count:desc`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return ((data.results ?? []) as Record<string, unknown>[]).slice(0, 10).map((r) => {
      const oaLocation = r.best_oa_location as Record<string, unknown> | null
      const authorships = (r.authorships as Record<string, unknown>[]) ?? []
      const authors = authorships.slice(0, 5).map((a) => (a.author as Record<string, unknown>)?.display_name as string ?? '').filter(Boolean)
      const primaryLocation = r.primary_location as Record<string, unknown> | undefined
      const source = primaryLocation?.source as Record<string, unknown> | undefined
      return {
        workId: (r.id as string) ?? '',
        title: (r.title as string) ?? '',
        authors: authors,
        publicationDate: (r.publication_date as string) ?? '',
        year: Number(r.publication_year) || 0,
        type: (r.type as string) ?? '',
        journal: (source?.display_name as string) ?? '',
        citationCount: Number(r.cited_by_count) || 0,
        doi: (r.doi as string) ?? '',
        openAccessUrl: (oaLocation?.pdf_url as string) ?? (oaLocation?.landing_page_url as string) ?? '',
      }
    })
  } catch {
    return []
  }
}
