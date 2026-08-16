import type { ArXivPaper } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://export.arxiv.org/api/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * arXiv literature. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit Atom feed remains [].
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

/**
 * Search arXiv for biology/bioinformatics papers
 */
export async function searchArXiv(query: string, limit: number = LIMITS.ARXIV.initial): Promise<ArXivPaper[]> {
  // Add biology/bioinformatics categories by default
  const searchQuery = `all:${query} AND (cat:q-bio.BM OR cat:q-bio.GN OR cat:q-bio.CB OR cat:q-bio.TO OR cat:q-bio.NC OR cat:q-bio.PE)`
  const searchUrl = `${BASE_URL}?search_query=${encodeURIComponent(searchQuery)}&max_results=${limit}`

  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(searchRes, 'arXiv')

  const text = await searchRes.text()

  // Parse Atom XML response
  const papers: ArXivPaper[] = []
  const entries = text.split('<entry>').slice(1)

  for (const entry of entries) {
    const idMatch = entry.match(/<id>([^<]+)<\/id>/)
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
    const summaryMatch = entry.match(/<summary>([^<]+)<\/summary>/)
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)
    const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/)

    // Extract authors
    const authors: string[] = []
    const authorMatches = Array.from(entry.matchAll(/<author>[\s\S]*?<name>([^<]+)<\/name>/g))
    for (const match of authorMatches) {
      authors.push(match[1].trim())
    }

    // Extract categories
    const categories: string[] = []
    const categoryMatches = Array.from(entry.matchAll(/<category[^>]*term="([^"]+)"/g))
    for (const match of categoryMatches) {
      categories.push(match[1])
    }

    const arxivId = idMatch ? (idMatch[1].split('/abs/')[1] || idMatch[1]) : ''
    const url = idMatch?.[1] || ''
    if (arxivId && titleMatch) {
      papers.push({
        arxivId,
        title: titleMatch[1].trim(),
        authors,
        abstract: summaryMatch?.[1]?.trim() || '',
        categories,
        publishedDate: publishedMatch?.[1]?.split('T')[0] || '',
        updatedDate: updatedMatch?.[1]?.split('T')[0] || '',
        url,
        pdfUrl: url.replace('/abs/', '/pdf/') + '.pdf',
      })
    }
  }

  return papers.slice(0, limit)
}

/**
 * Get arXiv paper by ID
 */
export async function getArXivPaper(arxivId: string): Promise<ArXivPaper | null> {
  const searchUrl = `${BASE_URL}?id_list=${arxivId}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(searchRes, 'arXiv')

  const text = await searchRes.text()
  const entry = text.split('<entry>')[1]?.split('</entry>')[0]

  if (!entry) return null

  const titleMatch = entry.match(/<title>([^<]+)<\/title>/)
  const summaryMatch = entry.match(/<summary>([^<]+)<\/summary>/)
  const publishedMatch = entry.match(/<published>([^<]+)<\/published>/)

  const authors: string[] = []
  const authorMatches = Array.from(entry.matchAll(/<author>[\s\S]*?<name>([^<]+)<\/name>/g))
  for (const match of authorMatches) {
    authors.push(match[1].trim())
  }

  const categories: string[] = []
  const categoryMatches = Array.from(entry.matchAll(/<category[^>]*term="([^"]+)"/g))
  for (const match of categoryMatches) {
    categories.push(match[1])
  }

  return {
    arxivId,
    title: titleMatch?.[1]?.trim() || '',
    authors,
    abstract: summaryMatch?.[1]?.trim() || '',
    categories,
    publishedDate: publishedMatch?.[1]?.split('T')[0] || '',
    updatedDate: '',
    url: `https://arxiv.org/abs/${arxivId}`,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
  }
}