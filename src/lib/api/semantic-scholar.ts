import type { SemanticPaper } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Semantic Scholar papers. HTTP / HTML / timeout are not EMPTY.
 * True zero-result JSON remains [].
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

export async function getSemanticPapersByName(name: string, limit: number = LIMITS.SEMANTIC_SCHOLAR.initial): Promise<SemanticPaper[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(name)}&limit=${limit}&fields=title,year,citationCount,abstract,url,tldr`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'Semantic Scholar')
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
}