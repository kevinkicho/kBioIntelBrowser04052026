import type { ClinGenGeneDisease, ClinGenVariant } from '../types'
import { LIMITS } from '../api-limits'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

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
  try {
    // ClinGen API for gene-disease validity
    const searchUrl = `https://search.clinicalgenome.org/api/gene-disease/?gene=${encodeURIComponent(geneSymbol)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || []

    return results.map((item: Record<string, unknown>) => {
      const disease = item.disease as Record<string, unknown> | undefined
      return {
        geneSymbol: geneSymbol,
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
  } catch (error) {
    console.error('ClinGen gene search error:', error)
    return []
  }
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
  try {
    const searchUrl = `https://search.clinicalgenome.org/api/dosage/?gene=${encodeURIComponent(geneSymbol)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const result = searchData?.results?.[0]

    if (!result) return null

    return {
      haploinsufficiency: String(result.haploinsufficiency || result.haploinsufficiency_score || 'Unknown'),
      triplosensitivity: String(result.triplosensitivity || result.triplosensitivity_score || 'Unknown'),
      dosageScore: parseFloat(String(result.dosage_score || result.score || 0)),
      url: `https://clinicalgenome.org/affiliation/${result.id || ''}`,
    }
  } catch (error) {
    console.error('ClinGen dosage search error:', error)
    return null
  }
}

/**
 * Search ClinGen for actionable variants by gene
 */
export async function searchClinGenActionable(geneSymbol: string, limit: number = LIMITS.CLINGEN.initial): Promise<ClinGenVariant[]> {
  try {
    const searchUrl = `https://search.clinicalgenome.org/api/variant/?gene=${encodeURIComponent(geneSymbol)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || []

    return results.map((item: Record<string, unknown>) => ({
      variantId: String(item.id || ''),
      geneSymbol: geneSymbol,
      variantName: String(item.name || item.hgvs_c || ''),
      clinicalSignificance: String(item.clinical_significance || item.significance || ''),
      reviewStatus: String(item.review_status || item.status || ''),
      condition: String(item.condition || item.disease_name || ''),
      url: `https://clinicalgenome.org/variant/${item.id || ''}`,
    })).filter((v: ClinGenVariant) => v.variantName && v.clinicalSignificance)
  } catch (error) {
    console.error('ClinGen actionable search error:', error)
    return []
  }
}