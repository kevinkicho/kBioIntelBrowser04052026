import type { SemanticPaper } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getSemanticPapersByName(name: string, limit: number = LIMITS.SEMANTIC_SCHOLAR.initial): Promise<SemanticPaper[]> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(name)}&limit=${limit}&fields=title,year,citationCount,abstract,url,tldr`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const papers = data?.data ?? data?.papers ?? []
    return (papers as Record<string, unknown>[]).map(item => ({
      paperId: (item.paperId as string) ?? '',
      title: (item.title as string) ?? '',
      authors: [] as string[],
      publicationDate: '',
      journal: '',
      citationCount: Number(item.citationCount) || 0,
      influentialCitationCount: 0,
      doi: '',
      tldr: (item.tldr as { text?: string })?.text ?? '',
      url: (item.url as string) ?? '',
      year: Number(item.year) || 0,
    }))
  } catch {
    return []
  }
}