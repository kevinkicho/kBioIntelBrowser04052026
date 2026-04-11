import type { CrossRefWork } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.crossref.org'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search CrossRef for works by title/author/DOI
 */
export async function searchCrossRef(query: string, limit: number = LIMITS.CROSSREF.initial): Promise<CrossRefWork[]> {
  try {
    const searchUrl = `${BASE_URL}/works?query=${encodeURIComponent(query)}&rows=${limit}&mailto=biointel@example.com`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const items = searchData?.message?.items || []

    return items.map((item: Record<string, unknown>) => {
      const containerTitle = item['container-title'] as string[] | undefined
      const shortContainerTitle = item['short-container-title'] as string[] | undefined
      const publishedPrint = item['published-print'] as Record<string, unknown> | undefined
      const publishedOnline = item['published-online'] as Record<string, unknown> | undefined
      const created = item.created as Record<string, unknown> | undefined

      const datePartsPrint = publishedPrint?.['date-parts'] as (number | string)[] | undefined
      const datePartsOnline = publishedOnline?.['date-parts'] as (number | string)[] | undefined
      const dateTime = created?.['date-time'] as string | undefined

      return {
        doi: String(item.DOI || ''),
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
        url: `https://doi.org/${item.DOI || ''}`,
      }
    }).filter((work: CrossRefWork) => work.doi && work.title)
  } catch (error) {
    console.error('CrossRef search error:', error)
    return []
  }
}

/**
 * Get work details by DOI
 */
export async function getCrossRefByDOI(doi: string): Promise<CrossRefWork | null> {
  try {
    const workUrl = `${BASE_URL}/works/${encodeURIComponent(doi)}`
    const workRes = await fetch(workUrl, fetchOptions)
    if (!workRes.ok) return null

    const workData = await workRes.json()
    const item = workData?.message as Record<string, unknown> | undefined

    if (!item) return null

    const containerTitle = item['container-title'] as string[] | undefined
    const publishedPrint = item['published-print'] as Record<string, unknown> | undefined
    const publishedOnline = item['published-online'] as Record<string, unknown> | undefined
    const datePartsPrint = publishedPrint?.['date-parts'] as (number | string)[] | undefined
    const datePartsOnline = publishedOnline?.['date-parts'] as (number | string)[] | undefined

    return {
      doi: String(item.DOI || doi),
      title: Array.isArray(item.title) ? item.title[0] : String(item.title || ''),
      authors: Array.isArray(item.author)
        ? item.author.map((a: Record<string, unknown>) =>
            `${a.given || ''} ${a.family || ''}`.trim()
          ).filter(Boolean)
        : [],
      journal: String(containerTitle?.[0] || ''),
      publicationDate: String(
        datePartsPrint?.join('-') ||
        datePartsOnline?.join('-') ||
        ''
      ),
      year: parseInt(String(datePartsPrint?.[0] || datePartsOnline?.[0] || '0'), 10),
      type: String(item.type || ''),
      publisher: String(item.publisher || ''),
      isReferencedByCount: parseInt(String(item['is-referenced-by-count'] || '0'), 10),
      referencesCount: parseInt(String(item['references-count'] || '0'), 10),
      url: `https://doi.org/${doi}`,
    }
  } catch (error) {
    console.error('CrossRef DOI fetch error:', error)
    return null
  }
}

/**
 * Get works that cite a given DOI
 */
export async function getCitations(doi: string, limit: number = LIMITS.CROSSREF.initial): Promise<CrossRefWork[]> {
  try {
    const citeUrl = `${BASE_URL}/works?filter=has-references:${encodeURIComponent(doi)}&rows=${limit}&mailto=biointel@example.com`
    const citeRes = await fetch(citeUrl, fetchOptions)
    if (!citeRes.ok) return []

    const citeData = await citeRes.json()
    const items = citeData?.message?.items || []

    return items.map((item: Record<string, unknown>) => {
      const containerTitle = item['container-title'] as string[] | undefined
      const publishedPrint = item['published-print'] as Record<string, unknown> | undefined
      const publishedOnline = item['published-online'] as Record<string, unknown> | undefined
      const datePartsPrint = publishedPrint?.['date-parts'] as (number | string)[] | undefined
      const datePartsOnline = publishedOnline?.['date-parts'] as (number | string)[] | undefined

      return {
        doi: String(item.DOI || ''),
        title: Array.isArray(item.title) ? item.title[0] : String(item.title || ''),
        authors: Array.isArray(item.author)
          ? item.author.map((a: Record<string, unknown>) =>
              `${a.given || ''} ${a.family || ''}`.trim()
            ).filter(Boolean)
          : [],
        journal: String(containerTitle?.[0] || ''),
        publicationDate: String(
          datePartsPrint?.join('-') ||
          datePartsOnline?.join('-') ||
          ''
        ),
        year: parseInt(String(datePartsPrint?.[0] || datePartsOnline?.[0] || '0'), 10),
        type: String(item.type || ''),
        publisher: String(item.publisher || ''),
        isReferencedByCount: parseInt(String(item['is-referenced-by-count'] || '0'), 10),
        referencesCount: parseInt(String(item['references-count'] || '0'), 10),
        url: `https://doi.org/${item.DOI || ''}`,
      }
    }).filter((work: CrossRefWork) => work.doi && work.title)
  } catch (error) {
    console.error('CrossRef citations fetch error:', error)
    return []
  }
}