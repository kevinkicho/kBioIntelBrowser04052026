import type { ClinVarVariant } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://clinicaltables.nlm.nih.gov/api/clinvar/v4'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

// NCBI credentials from environment
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
const NCBI_API_KEY = getApiKey('NCBI_API_KEY') ?? ''

// Helper to add NCBI credentials to E-Utilities URLs
const withNCBICreds = (url: string): string => {
  const params = new URLSearchParams()
  if (NCBI_EMAIL) params.append('email', NCBI_EMAIL)
  if (NCBI_API_KEY) params.append('api_key', NCBI_API_KEY)
  const creds = params.toString()
  return creds ? `${url}${url.includes('?') ? '&' : '?'}${creds}` : url
}

/**
 * ClinVar harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing id, and zero-hit JSON remain empty.
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

export interface ClinVarSearchResponse {
  variants: ClinVarVariant[]
  total: number
}

export async function getClinVarVariantsByName(name: string, limit: number = LIMITS.CLINVAR.initial): Promise<ClinVarVariant[]> {
  const q = name?.trim()
  if (!q) return []

  const searchRes = await timedFetch(
    withNCBICreds(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(q)}&retmode=json&retmax=${limit}`),
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'ClinVar')
  const searchData = await searchRes.json()
  const ids: string[] = searchData?.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const summaryRes = await timedFetch(
    withNCBICreds(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(',')}&retmode=json`),
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'ClinVar')
  const summaryData = await summaryRes.json()
  const resultObj = summaryData?.result ?? {}

  return ids
    .map((id): ClinVarVariant | null => {
      const entry = resultObj[id]
      if (!entry) return null
      return {
        variantId: id,
        title: entry.title ?? '',
        clinicalSignificance: entry.clinical_significance?.description ?? '',
        gene: entry.genes?.[0]?.symbol ?? '',
        geneSymbol: entry.genes?.[0]?.symbol ?? '',
        condition: entry.trait_set?.[0]?.trait_name ?? '',
        conditionName: entry.trait_set?.[0]?.trait_name ?? '',
        reviewStatus: entry.clinical_significance?.review_status ?? '',
        variantType: '',
        chromosome: '',
        position: 0,
        url: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}/`,
      }
    })
    .filter((v): v is ClinVarVariant => v !== null)
}

/**
 * Search ClinVar by variant name, gene, or condition using clinical tables API
 */
export async function searchClinVar(
  term: string,
  maxResults = 20,
): Promise<ClinVarSearchResponse> {
  const q = term?.trim()
  if (!q) return { variants: [], total: 0 }

  const params = new URLSearchParams({
    terms: q,
    count: maxResults.toString(),
    df: 'rcv_accession,clinical_significance,condition_name,gene_symbol,variant_type,chromosome,pos,review_status',
  })
  const url = `${BASE_URL}/search?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return { variants: [], total: 0 }
  throwIfHttpFailed(res, 'ClinVar')
  const data = await res.json()

  const total = data[0] ?? 0
  const rowList = data[2] ?? []

  return {
    variants: rowList.map((row: (string | number)[]) => ({
      variantId: row[0] ?? '',
      clinicalSignificance: row[1] ?? '',
      conditionName: row[2] ?? '',
      geneSymbol: row[3] ?? '',
      variantType: row[4] ?? '',
      chromosome: row[5] ?? '',
      position: row[6] ?? 0,
      reviewStatus: row[7] ?? '',
      url: `https://www.ncbi.nlm.nih.gov/clinvar/${row[0]}`,
    })),
    total,
  }
}

/**
 * Get variant details by RCV accession
 */
export async function getClinVarVariant(rcvAccession: string): Promise<ClinVarVariant | null> {
  const result = await searchClinVar(rcvAccession, 1)
  return result.variants[0] ?? null
}

/**
 * Search ClinVar by gene symbol
 */
export async function getClinVarByGene(geneSymbol: string): Promise<ClinVarVariant[]> {
  const result = await searchClinVar(geneSymbol, 50)
  return result.variants
}

/**
 * Filter variants by clinical significance
 */
export function filterClinVarVariantsBySignificance(
  variants: ClinVarVariant[],
  significance: string,
): ClinVarVariant[] {
  return variants.filter((v) =>
    v.clinicalSignificance.toLowerCase().includes(significance.toLowerCase()),
  )
}