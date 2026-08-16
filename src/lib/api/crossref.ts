import type { CrossRefWork } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.crossref.org'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Crossref literature. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains []. Missing DOI lookup (404) remains null.
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

function mapWork(item: Record<string, unknown>, fallbackDoi = ''): CrossRefWork {
  const containerTitle = item['container-title'] as string[] | undefined
  const shortContainerTitle = item['short-container-title'] as string[] | undefined
  const publishedPrint = item['published-print'] as Record<string, unknown> | undefined
  const publishedOnline = item['published-online'] as Record<string, unknown> | undefined
  const created = item.created as Record<string, unknown> | undefined

  const datePartsPrint = publishedPrint?.['date-parts'] as (number | string)[] | undefined
  const datePartsOnline = publishedOnline?.['date-parts'] as (number | string)[] | undefined
  const dateTime = created?.['date-time'] as string | undefined

  const doi = String(item.DOI || fallbackDoi)
  return {
    doi,
    title: Array.isArray(item.title) ? item.title[0] : String(item.title || ''),
    authors: Array.isArray(item.author)
      ? item.author.map((a: Record<string, unknown>) =>
          `${a.given || ''} ${a.family || ''}`.trim()
        ).filter(Boolean)
      : [],
    journal: String(containerTitle?.[0] || shortContainerTitle?.[0] || ''),
    publicationDate: String(
      (datePartsPrint?.join('-') || datePartsOnline?.join('-') || dateTime?.split('T')[0] || '')
    ),
    year: parseInt(String(
      datePartsPrint?.[0] ||
      datePartsOnline?.[0] ||
      '0'
    ), 10),
    type: String(item.type || ''),
    publisher: String(item.publisher || ''),
    isReferencedByCount: parseInt(String(item['is-referenced-by-count'] || '0'), 10),
    referencesCount: parseInt(String(item['references-count'] || '0'), 10),
    url: `https://doi.org/${doi}`,
  }
}

/**
 * Search CrossRef for works by title/author/DOI
 */
export async function searchCrossRef(query: string, limit: number = LIMITS.CROSSREF.initial): Promise<CrossRefWork[]> {
  const searchUrl = `${BASE_URL}/works?query=${encodeURIComponent(query)}&rows=${limit}&mailto=biointel@example.com`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(searchRes, 'Crossref')

  const searchData = await searchRes.json()
  const items = searchData?.message?.items || []

  return items.map((item: Record<string, unknown>) => mapWork(item)).filter((work: CrossRefWork) => work.doi && work.title)
}

/**
 * Get work details by DOI
 */
export async function getCrossRefByDOI(doi: string): Promise<CrossRefWork | null> {
  const workUrl = `${BASE_URL}/works/${encodeURIComponent(doi)}`
  const workRes = await timedFetch(workUrl, { ...fetchOptions, timeoutMs: 8000 })
  // Crossref 404 = no such DOI (honest absence). 5xx / HTML / timeout are not EMPTY.
  if (workRes.status === 404) return null
  throwIfHttpFailed(workRes, 'Crossref')

  const workData = await workRes.json()
  const item = workData?.message as Record<string, unknown> | undefined

  if (!item) return null

  return mapWork(item, doi)
}

/**
 * Get works that cite a given DOI
 */
export async function getCitations(doi: string, limit: number = LIMITS.CROSSREF.initial): Promise<CrossRefWork[]> {
  const citeUrl = `${BASE_URL}/works?filter=has-references:${encodeURIComponent(doi)}&rows=${limit}&mailto=biointel@example.com`
  const citeRes = await timedFetch(citeUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(citeRes, 'Crossref')

  const citeData = await citeRes.json()
  const items = citeData?.message?.items || []

  return items.map((item: Record<string, unknown>) => mapWork(item)).filter((work: CrossRefWork) => work.doi && work.title)
}