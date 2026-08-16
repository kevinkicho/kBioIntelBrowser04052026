import type { dbSNPVariant } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

// NCBI credentials from environment
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
const NCBI_API_KEY = getApiKey('NCBI_API_KEY') ?? ''

// Helper to add NCBI credentials to URLs
const withNCBICreds = (url: string): string => {
  const params = new URLSearchParams()
  if (NCBI_EMAIL) params.append('email', NCBI_EMAIL)
  if (NCBI_API_KEY) params.append('api_key', NCBI_API_KEY)
  const creds = params.toString()
  return creds ? `${url}${url.includes('?') ? '&' : '?'}${creds}` : url
}

/**
 * dbSNP harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
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

function mapSnp(id: string, snp: Record<string, unknown>, clinicalOverride?: boolean): dbSNPVariant {
  return {
    rsId: `rs${id}`,
    refSNPId: id,
    chromosome: String(snp.chromosome || ''),
    position: parseInt(String(snp.chromosomepos || '0'), 10),
    alleles: String(snp.alleles || ''),
    clinicalSignificance: String(snp.clinical_significance || snp.clinicalsignificance || ''),
    clinical: clinicalOverride ?? (snp.clinical === '1' || snp.clinical === true),
    frequency: parseFloat(String(snp.frequency || '0')),
    genes: (snp.genes as string[]) || [],
    clinicalAllele: String(snp.clinical_allele || ''),
    reviewed: snp.reviewed === '1' || snp.reviewed === true,
    url: `https://www.ncbi.nlm.nih.gov/snp/rs${id}`,
  }
}

/**
 * Search dbSNP for variants by gene symbol
 */
export async function searchdbSNPByGene(geneSymbol: string, limit: number = LIMITS.DBSNP.initial): Promise<dbSNPVariant[]> {
  const q = geneSymbol?.trim()
  if (!q) return []

  const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=snp&term=${encodeURIComponent(q)}[Gene]&retmax=${limit}&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'dbSNP')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${ids.join(',')}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'dbSNP')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => mapSnp(id, result[id] || {})).filter((v: dbSNPVariant) => v.rsId)
}

/**
 * Get variant details by rsId
 */
export async function getdbSNPVariant(rsId: string): Promise<dbSNPVariant | null> {
  const id = rsId?.replace(/^rs/i, '').trim()
  if (!id) return null

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${id}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return null
  throwIfHttpFailed(summaryRes, 'dbSNP')

  const summaryData = await summaryRes.json()
  const snp = summaryData?.result?.[id]
  if (!snp) return null

  return mapSnp(id, snp)
}

/**
 * Get dbSNP variants by molecule name (searches associated genes)
 */
export async function getDbSNPVariants(moleculeName: string, limit: number = LIMITS.DBSNP.initial): Promise<dbSNPVariant[]> {
  return searchdbSNPByGene(moleculeName, limit)
}

/**
 * Search for clinically significant variants
 */
export async function searchClinicalVariants(geneSymbol: string, limit: number = LIMITS.DBSNP.initial): Promise<dbSNPVariant[]> {
  const q = geneSymbol?.trim()
  if (!q) return []

  const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=snp&term=${encodeURIComponent(q)}[Gene]+AND+clinical[Filter]&retmax=${limit}&retmode=json`)
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'dbSNP')

  const searchData = await searchRes.json()
  const ids = searchData?.esearchresult?.idlist || []
  if (ids.length === 0) return []

  const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${ids.join(',')}&retmode=json`)
  const summaryRes = await timedFetch(summaryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'dbSNP')

  const summaryData = await summaryRes.json()
  const result = summaryData?.result || {}

  return ids.map((id: string) => mapSnp(id, result[id] || {}, true)).filter((v: dbSNPVariant) => v.rsId)
}
