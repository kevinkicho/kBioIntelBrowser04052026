import type { dbSNPVariant } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'

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
 * Search dbSNP for variants by gene symbol
 */
export async function searchdbSNPByGene(geneSymbol: string, limit: number = LIMITS.DBSNP.initial): Promise<dbSNPVariant[]> {
  try {
    // Search for SNPs in the gene
    const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=snp&term=${encodeURIComponent(geneSymbol)}[Gene]&retmax=${limit}&retmode=json`)
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    // Fetch summaries
    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${ids.join(',')}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const snp = result[id] || {}
      return {
        rsId: `rs${id}`,
        refSNPId: id,
        chromosome: snp.chromosome || '',
        position: parseInt(snp.chromosomepos || '0', 10),
        alleles: snp.alleles || '',
        clinicalSignificance: snp.clinical_significance || snp.clinicalsignificance || '',
        clinical: snp.clinical === '1' || snp.clinical === true,
        frequency: parseFloat(snp.frequency || '0'),
        genes: snp.genes || [],
        clinicalAllele: snp.clinical_allele || '',
        reviewed: snp.reviewed === '1' || snp.reviewed === true,
        url: `https://www.ncbi.nlm.nih.gov/snp/rs${id}`,
      }
    }).filter((v: dbSNPVariant) => v.rsId)
  } catch (error) {
    console.error('dbSNP search error:', error)
    return []
  }
}

/**
 * Get variant details by rsId
 */
export async function getdbSNPVariant(rsId: string): Promise<dbSNPVariant | null> {
  try {
    // Remove 'rs' prefix if present
    const id = rsId.replace(/^rs/i, '')

    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${id}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return null

    const summaryData = await summaryRes.json()
    const snp = summaryData?.result?.[id]

    if (!snp) return null

    return {
      rsId: `rs${id}`,
      refSNPId: id,
      chromosome: snp.chromosome || '',
      position: parseInt(snp.chromosomepos || '0', 10),
      alleles: snp.alleles || '',
      clinicalSignificance: snp.clinical_significance || '',
      clinical: snp.clinical === '1' || snp.clinical === true,
      frequency: parseFloat(snp.frequency || '0'),
      genes: snp.genes || [],
      clinicalAllele: snp.clinical_allele || '',
      reviewed: snp.reviewed === '1' || snp.reviewed === true,
      url: `https://www.ncbi.nlm.nih.gov/snp/rs${id}`,
    }
  } catch (error) {
    console.error('dbSNP variant fetch error:', error)
    return null
  }
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
  try {
    const searchUrl = withNCBICreds(`${BASE_URL}/esearch.fcgi?db=snp&term=${encodeURIComponent(geneSymbol)}[Gene]+AND+clinical[Filter]&retmax=${limit}&retmode=json`)
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const ids = searchData?.esearchresult?.idlist || []

    if (ids.length === 0) return []

    const summaryUrl = withNCBICreds(`${BASE_URL}/esummary.fcgi?db=snp&id=${ids.join(',')}&retmode=json`)
    const summaryRes = await fetch(summaryUrl, fetchOptions)
    if (!summaryRes.ok) return []

    const summaryData = await summaryRes.json()
    const result = summaryData?.result || {}

    return ids.map((id: string) => {
      const snp = result[id] || {}
      return {
        rsId: `rs${id}`,
        refSNPId: id,
        chromosome: snp.chromosome || '',
        position: parseInt(snp.chromosomepos || '0', 10),
        alleles: snp.alleles || '',
        clinicalSignificance: snp.clinical_significance || '',
        clinical: true,
        frequency: parseFloat(snp.frequency || '0'),
        genes: snp.genes || [],
        clinicalAllele: snp.clinical_allele || '',
        reviewed: snp.reviewed === '1' || snp.reviewed === true,
        url: `https://www.ncbi.nlm.nih.gov/snp/rs${id}`,
      }
    }).filter((v: dbSNPVariant) => v.rsId)
  } catch (error) {
    console.error('Clinical variants search error:', error)
    return []
  }
}