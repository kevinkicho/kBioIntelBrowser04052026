import type { ClinGenGeneDisease, ClinGenVariant } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * ClinGen harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, and zero-hit JSON remain empty.
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

/**
 * Get ClinGen data by molecule name (wrapper for gene search)
 */
export async function getClinGenData(moleculeName: string): Promise<{
  geneDiseases: ClinGenGeneDisease[]
  variants: ClinGenVariant[]
}> {
  const [geneDiseases, variants] = await Promise.all([
    searchClinGenByGene(moleculeName, 15),
    searchClinGenActionable(moleculeName, 15),
  ])
  return { geneDiseases, variants }
}

/**
 * Search ClinGen for gene-disease validity by gene symbol
 */
export async function searchClinGenByGene(geneSymbol: string, limit: number = LIMITS.CLINGEN.initial): Promise<ClinGenGeneDisease[]> {
  const q = geneSymbol.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `https://search.clinicalgenome.org/api/gene-disease/?gene=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'ClinGen')
  const searchData = await searchRes.json()
  const results = searchData?.results || []
  return results.map((item: Record<string, unknown>) => {
    const disease = item.disease as Record<string, unknown> | undefined
    return {
      geneSymbol: q,
      geneDiseaseId: String(item.id || ''),
      diseaseName: String(item.disease_name || disease?.name || ''),
      diseaseId: String(disease?.id || item.mondo_id || ''),
      validityClassification: String(item.validity_classification || item.classification || ''),
      validityScore: parseFloat(String(item.validity_score || item.score || 0)),
      modeOfInheritance: String(item.mode_of_inheritance || item.inheritance || ''),
      assertionDate: String(item.assertion_date || item.date_created || ''),
      expertPanel: String(item.expert_panel || item.workshop || ''),
      url: `https://clinicalgenome.org/affiliation/${item.id || ''}`,
    }
  }).filter((d: ClinGenGeneDisease) => d.diseaseName && d.validityClassification)
}

/**
 * Search ClinGen for dosage sensitivity by gene
 */
export async function getClinGenDosage(geneSymbol: string): Promise<{
  haploinsufficiency: string
  triplosensitivity: string
  dosageScore: number
  url: string
} | null> {
  const q = geneSymbol.trim()
  if (!q || q.length < 2) return null
  const searchUrl = `https://search.clinicalgenome.org/api/dosage/?gene=${encodeURIComponent(q)}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return null
  throwIfHttpFailed(searchRes, 'ClinGen')
  const searchData = await searchRes.json()
  const result = searchData?.results?.[0]
  if (!result) return null
  return {
    haploinsufficiency: String(result.haploinsufficiency || result.haploinsufficiency_score || 'Unknown'),
    triplosensitivity: String(result.triplosensitivity || result.triplosensitivity_score || 'Unknown'),
    dosageScore: parseFloat(String(result.dosage_score || result.score || 0)),
    url: `https://clinicalgenome.org/affiliation/${result.id || ''}`,
  }
}

/**
 * Search ClinGen for actionable variants by gene
 */
export async function searchClinGenActionable(geneSymbol: string, limit: number = LIMITS.CLINGEN.initial): Promise<ClinGenVariant[]> {
  const q = geneSymbol.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `https://search.clinicalgenome.org/api/variant/?gene=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'ClinGen')
  const searchData = await searchRes.json()
  const results = searchData?.results || []
  return results.map((item: Record<string, unknown>) => ({
    variantId: String(item.id || ''),
    geneSymbol: q,
    variantName: String(item.name || item.hgvs_c || ''),
    clinicalSignificance: String(item.clinical_significance || item.significance || ''),
    reviewStatus: String(item.review_status || item.status || ''),
    condition: String(item.condition || item.disease_name || ''),
    url: `https://clinicalgenome.org/variant/${item.id || ''}`,
  })).filter((v: ClinGenVariant) => v.variantName && v.clinicalSignificance)
}