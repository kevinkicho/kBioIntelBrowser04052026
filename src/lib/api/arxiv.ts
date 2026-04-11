import type { ArXivPaper } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'http://export.arxiv.org/api/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search arXiv for biology/bioinformatics papers
 */
export async function searchArXiv(query: string, limit: number = LIMITS.ARXIV.initial): Promise<ArXivPaper[]> {
  try {
    // Add biology/bioinformatics categories by default
    const searchQuery = `${query} AND (cat:q-bio.BM OR cat:q-bio.GN OR cat:q-bio.CB OR cat:q-bio.TO OR cat:q-bio.NC OR cat:q-bio.PE)`
    const searchUrl = `${BASE_URL}?search_query=all:${encodeURIComponent(searchQuery)}&max_results=${limit}`

    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

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
  } catch (error) {
    console.error('arXiv search error:', error)
    return []
  }
}

/**
 * Get arXiv paper by ID
 */
export async function getArXivPaper(arxivId: string): Promise<ArXivPaper | null> {
  try {
    const searchUrl = `${BASE_URL}?id_list=${arxivId}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

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
  } catch (error) {
    console.error('arXiv paper fetch error:', error)
    return null
  }
}