import type { ClinVarVariant } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'

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

export interface ClinVarSearchResponse {
  variants: ClinVarVariant[]
  total: number
}

export async function getClinVarVariantsByName(name: string, limit: number = LIMITS.CLINVAR.initial): Promise<ClinVarVariant[]> {
  try {
    const searchRes = await fetch(
      withNCBICreds(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(name)}&retmode=json&retmax=${limit}`),
      fetchOptions,
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const ids: string[] = searchData?.esearchresult?.idlist ?? []
    if (ids.length === 0) return []

    const summaryRes = await fetch(
      withNCBICreds(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids.join(',')}&retmode=json`),
      fetchOptions,
    )
    if (!summaryRes.ok) return []
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
  } catch {
    return []
  }
}

/**
 * Search ClinVar by variant name, gene, or condition using clinical tables API
 */
export async function searchClinVar(
  term: string,
  maxResults = 20,
): Promise<ClinVarSearchResponse> {
  try {
    const params = new URLSearchParams({
      terms: term,
      count: maxResults.toString(),
      df: 'rcv_accession,clinical_significance,condition_name,gene_symbol,variant_type,chromosome,pos,review_status',
    })
    const url = `${BASE_URL}/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('ClinVar search failed')
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
  } catch {
    return { variants: [], total: 0 }
  }
}

/**
 * Get variant details by RCV accession
 */
export async function getClinVarVariant(rcvAccession: string): Promise<ClinVarVariant | null> {
  try {
    const result = await searchClinVar(rcvAccession, 1)
    return result.variants[0] ?? null
  } catch {
    return null
  }
}

/**
 * Search ClinVar by gene symbol
 */
export async function getClinVarByGene(geneSymbol: string): Promise<ClinVarVariant[]> {
  try {
    const result = await searchClinVar(geneSymbol, 50)
    return result.variants
  } catch {
    return []
  }
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
