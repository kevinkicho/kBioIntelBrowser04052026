import type { PubMedArticle } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

// NCBI credentials from environment
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
const NCBI_API_KEY = getApiKey('NCBI_API_KEY') ?? ''

// Helper to add NCBI credentials to URL
const withNCBICredentials = (url: string): string => {
  const params = new URLSearchParams()
  if (NCBI_EMAIL) params.append('email', NCBI_EMAIL)
  if (NCBI_API_KEY) params.append('api_key', NCBI_API_KEY)
  const creds = params.toString()
  return creds ? `${url}${url.includes('?') ? '&' : '?'}${creds}` : url
}

/**
 * PubMed literature. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
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
 * Search PubMed for articles by query
 */
export async function searchPubMed(query: string, limit: number = LIMITS.PUBMED.initial): Promise<PubMedArticle[]> {
  // Step 1: Search for PMIDs
  const searchUrl = withNCBICredentials(`${BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${limit}&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(searchRes, 'PubMed')

  const searchData = await searchRes.json()
  const pmids = searchData?.esearchresult?.idlist || []

  if (pmids.length === 0) return []

  // Step 2: Fetch summaries for all PMIDs
  const summaryUrl = withNCBICredentials(`${BASE_URL}/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(summaryRes, 'PubMed')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  // Step 3: Parse and return articles
  return pmids.map((pmid: string) => {
    const article = result[pmid] || {}
    return {
      pmid,
      title: article.title || '',
      authors: (article.authors || []).map((a: { name: string }) => a.name).filter(Boolean),
      journal: article.fulljournalname || article.journal || '',
      pubDate: article.pubdate || '',
      volume: article.volume || '',
      issue: article.issue || '',
      pages: article.pages || '',
      doi: article.elocationid?.find?.((e: string) => e.includes('doi'))?.replace('doi: ', '') || '',
      pmcid: article.pmcid || undefined,
      abstract: '', // Abstracts require efetch, skip for summary
      keywords: [],
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    }
  }).filter((a: PubMedArticle) => a.title)
}

/**
 * Get detailed article information including abstract
 */
export async function getPubMedArticle(pmid: string): Promise<PubMedArticle | null> {
  const fetchUrl = withNCBICredentials(`${BASE_URL}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`)
  const fetchRes = await timedFetch(fetchUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(fetchRes, 'PubMed')

  const xmlText = await fetchRes.text()

  // Parse XML to extract abstract and keywords
  const abstract = extractFromXml(xmlText, 'AbstractText')
  const keywords = extractKeywordsFromXml(xmlText)

  // Also get summary for other fields
  const summaryUrl = withNCBICredentials(`${BASE_URL}/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(summaryRes, 'PubMed')

  const summaryData = await summaryRes.json()
  const article = summaryData?.result?.[pmid] || {}

  return {
    pmid,
    title: article.title || '',
    authors: (article.authors || []).map((a: { name: string }) => a.name).filter(Boolean),
    journal: article.fulljournalname || article.journal || '',
    pubDate: article.pubdate || '',
    volume: article.volume || '',
    issue: article.issue || '',
    pages: article.pages || '',
    doi: article.elocationid?.find?.((e: string) => e.includes('doi'))?.replace('doi: ', '') || '',
    pmcid: article.pmcid || undefined,
    abstract,
    keywords,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
  }
}

/**
 * Search PubMed by MeSH term
 */
export async function searchByMeshTerm(meshTerm: string, limit: number = LIMITS.PUBMED.initial): Promise<PubMedArticle[]> {
  return searchPubMed(`${meshTerm}[MeSH]`, limit)
}

/**
 * Search PubMed by author
 */
export async function searchByAuthor(authorName: string, limit: number = LIMITS.PUBMED.initial): Promise<PubMedArticle[]> {
  return searchPubMed(`${authorName}[Author]`, limit)
}

/**
 * Get related articles (similar to PubMed's "Similar articles")
 */
export async function getRelatedArticles(pmid: string, limit: number = LIMITS.PUBMED.initial): Promise<PubMedArticle[]> {
  const linkUrl = withNCBICredentials(`${BASE_URL}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&cmd=neighbor&retmode=json`)
  const linkRes = await timedFetch(linkUrl, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(linkRes, 'PubMed')

  const linkData = await linkRes.json()
  const relatedPmids = linkData?.linksets?.[0]?.linksetDbDatas?.[0]?.links || []

  if (relatedPmids.length === 0) return []

  const limitedPmids = relatedPmids.slice(0, limit)
  return searchPubMed(limitedPmids.join(' OR '), limit)
}

/**
 * Helper: Extract text from XML
 */
function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi')
  const matches = xml.match(regex)
  if (!matches) return ''
  return matches.map(m => m.replace(/<[^>]*>/g, '').trim()).join(' ')
}

/**
 * Helper: Extract keywords from XML
 */
function extractKeywordsFromXml(xml: string): string[] {
  const keywords: string[] = []

  // MeSH terms
  const meshRegex = /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g
  let match
  while ((match = meshRegex.exec(xml)) !== null) {
    keywords.push(match[1])
  }

  // Keywords
  const keywordRegex = /<Keyword[^>]*>([^<]+)<\/Keyword>/g
  while ((match = keywordRegex.exec(xml)) !== null) {
    keywords.push(match[1])
  }

  return Array.from(new Set(keywords)).slice(0, 10)
}