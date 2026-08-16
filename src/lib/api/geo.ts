import type { GEODataset } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const GEO_API = 'https://www.ncbi.nlm.nih.gov/geo'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * GEO harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing query, and zero-hit JSON remain empty.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

function mapGeoDataset(id: string, dataset: Record<string, unknown>, accessionFallback?: string): GEODataset {
  const accession = String(dataset.accession || dataset.nacc || accessionFallback || '')
  return {
    geoId: id,
    accession,
    title: String(dataset.title || dataset.summary || ''),
    summary: String(dataset.summary || ''),
    organism: String(dataset.organism || ''),
    platformType: String(dataset.platformtype || ''),
    sampleType: String(dataset.sampletype || ''),
    seriesType: String(dataset.seriestype || ''),
    nSamples: parseInt(String(dataset.nsamples || '0'), 10),
    nFeatures: parseInt(String(dataset.nfeatures || '0'), 10),
    releaseDate: String(dataset.releasedate || dataset.pdat || ''),
    lastUpdate: String(dataset.lastupdate || ''),
    url: `${GEO_API}/query/acc.cgi?acc=${accession || id}`,
  }
}

/**
 * Search GEO for gene expression datasets related to a molecule/gene
 */
export async function searchGEO(query: string, limit: number = LIMITS.GEO.initial): Promise<GEODataset[]> {
  const q = query?.trim()
  if (!q) return []

  const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${encodeURIComponent(q)}&retmax=${limit}&retmode=json`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GEO')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids.join(',')}&retmode=json`
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'GEO')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => mapGeoDataset(id, result[id] || {})).filter((d: GEODataset) => d.accession && d.title)
}

/**
 * Get GEO series (GSE) details by accession
 */
export async function getGEOSeries(accession: string): Promise<GEODataset | null> {
  const q = accession?.trim()
  if (!q) return null

  const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${q}[Accession]&retmax=1&retmode=json`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return null
  throwIfHttpFailed(searchRes, 'GEO')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return null

  const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids[0]}&retmode=json`
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return null
  throwIfHttpFailed(summaryRes, 'GEO')

  const summaryData = await summaryRes.json()
  const dataset = summaryData?.result?.[ids[0]]
  if (!dataset) return null

  return mapGeoDataset(ids[0], dataset, q)
}

/**
 * Search GEO profiles (gene expression profiles) by gene symbol
 */
export async function searchGEOProfiles(geneSymbol: string, limit: number = LIMITS.GEO.initial): Promise<GEODataset[]> {
  const q = geneSymbol?.trim()
  if (!q) return []

  const searchUrl = `${BASE_URL}/esearch.fcgi?db=gds&term=${encodeURIComponent(q)}[Gene]+AND+gpl[Filter]&retmax=${limit}&retmode=json`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'GEO')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = `${BASE_URL}/esummary.fcgi?db=gds&id=${ids.join(',')}&retmode=json`
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'GEO')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => {
    const dataset = result[id] || {}
    return {
      geoId: id,
      accession: dataset.accession || '',
      title: dataset.title || '',
      summary: dataset.summary || '',
      organism: dataset.organism || '',
      platformType: dataset.platformtype || '',
      sampleType: dataset.sampletype || '',
      seriesType: dataset.seriestype || '',
      nSamples: parseInt(dataset.nsamples || '0', 10),
      nFeatures: parseInt(dataset.nfeatures || '0', 10),
      releaseDate: dataset.releasedate || '',
      lastUpdate: dataset.lastupdate || '',
      url: `${GEO_API}/query/acc.cgi?acc=${dataset.accession || id}`,
    }
  }).filter((d: GEODataset) => d.accession && d.title)
}
