import type { CPICGuideline, CPICRecommendation } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://api.cpicpgx.org/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search CPIC for pharmacogenetic guidelines by drug
 * CPIC provides clinical dosing recommendations based on genetic testing
 */
export async function searchCPICGuidelines(query: string, limit: number = LIMITS.CPIC.initial): Promise<CPICGuideline[]> {
  try {
    // CPIC API supports searching by drug name
    const searchUrl = `${BASE_URL}/guideline?search=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const guidelines = searchData?.results || searchData?.guidelines || []

    return guidelines.map((g: Record<string, unknown>) => ({
      id: String(g.id || ''),
      drugName: String(g.drugName || g.drug_name || g.drug || ''),
      drugClass: String(g.drugClass || g.drug_class || ''),
      gene: String(g.gene || g.genes || ''),
      guidelineId: String(g.guidelineId || g.guideline_id || g.cpicId || ''),
      lastUpdated: String(g.lastUpdated || g.last_updated || g.updated || ''),
      url: `https://cpicpgx.org/guidelines/guideline-for-${g.id || ''}/`,
      recommendations: Array.isArray(g.recommendations) ? g.recommendations.map(formatRecommendation) : [],
    })).filter((g: CPICGuideline) => g.drugName && g.gene)
  } catch (error) {
    console.error('CPIC search error:', error)
    return []
  }
}

/**
 * Get CPIC recommendations for a specific drug and gene
 */
export async function getCPICRecommendations(drugName: string, geneSymbol?: string): Promise<CPICGuideline[]> {
  try {
    let searchUrl = `${BASE_URL}/recommendation?drug=${encodeURIComponent(drugName)}`
    if (geneSymbol) {
      searchUrl += `&gene=${encodeURIComponent(geneSymbol)}`
    }

    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const recommendations = searchData?.results || searchData || []

    // Group recommendations by drug-gene pair
    const grouped = new Map<string, CPICGuideline>()

    for (const rec of recommendations) {
      const key = `${rec.drugName || rec.drug_name || drugName}-${rec.gene || ''}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: String(rec.guidelineId || rec.guideline_id || ''),
          drugName: String(rec.drugName || rec.drug_name || drugName),
          drugClass: String(rec.drugClass || rec.drug_class || ''),
          gene: String(rec.gene || ''),
          guidelineId: String(rec.guidelineId || rec.guideline_id || ''),
          lastUpdated: String(rec.lastUpdated || rec.last_updated || ''),
          url: `https://cpicpgx.org/guidelines/guideline-for-${rec.drug_name || drugName}/`,
          recommendations: [],
        })
      }

      const guideline = grouped.get(key)!
      guideline.recommendations.push(formatRecommendation(rec))
    }

    return Array.from(grouped.values())
  } catch (error) {
    console.error('CPIC recommendations fetch error:', error)
    return []
  }
}

/**
 * Get all CPIC guidelines for a gene
 */
export async function getCPICGuidelinesByGene(geneSymbol: string): Promise<CPICGuideline[]> {
  try {
    const searchUrl = `${BASE_URL}/guideline?gene=${encodeURIComponent(geneSymbol)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const guidelines = searchData?.results || searchData?.guidelines || []

    return guidelines.map((g: Record<string, unknown>) => ({
      id: String(g.id || ''),
      drugName: String(g.drugName || g.drug_name || g.drug || ''),
      drugClass: String(g.drugClass || g.drug_class || ''),
      gene: geneSymbol,
      guidelineId: String(g.guidelineId || g.guideline_id || ''),
      lastUpdated: String(g.lastUpdated || g.last_updated || ''),
      url: `https://cpicpgx.org/guidelines/guideline-for-${g.id || ''}/`,
      recommendations: Array.isArray(g.recommendations) ? g.recommendations.map(formatRecommendation) : [],
    }))
  } catch (error) {
    console.error('CPIC gene guidelines error:', error)
    return []
  }
}

/**
 * Get comprehensive CPIC data for a drug
 */
export async function getCPICData(drugName: string): Promise<CPICGuideline[]> {
  try {
    const guidelines = await searchCPICGuidelines(drugName, 50)

    // If no results found, try getting recommendations directly
    if (guidelines.length === 0) {
      return await getCPICRecommendations(drugName)
    }

    return guidelines
  } catch (error) {
    console.error('CPIC data fetch error:', error)
    return []
  }
}

function formatRecommendation(r: Record<string, unknown>): CPICRecommendation {
  return {
    phenotype: String(r.phenotype || r.genotype || ''),
    activityScore: String(r.activityScore || r.activity_score || ''),
    implication: String(r.implication || ''),
    therapeuticRecommendation: String(r.therapeuticRecommendation || r.therapeutic_recommendation || r.recommendation || ''),
    classification: String(r.classification || r.strength || ''),
    strength: String(r.strength || r.evidence_level || ''),
  }
}