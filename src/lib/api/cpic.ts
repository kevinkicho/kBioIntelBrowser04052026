import type { CPICGuideline, CPICRecommendation } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://api.cpicpgx.org/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * CPIC harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, and zero-hit JSON remain empty.
 * Same-source fallback (guidelines -> recommendations) still runs; if the
 * fallback also fails, the error is thrown.
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

/**
 * Search CPIC for pharmacogenetic guidelines by drug
 */
export async function searchCPICGuidelines(query: string, limit: number = LIMITS.CPIC.initial): Promise<CPICGuideline[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/guideline?search=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CPIC')
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
}

/**
 * Get CPIC recommendations for a specific drug and gene
 */
export async function getCPICRecommendations(drugName: string, geneSymbol?: string): Promise<CPICGuideline[]> {
  const q = drugName.trim()
  if (!q || q.length < 2) return []
  let searchUrl = `${BASE_URL}/recommendation?drug=${encodeURIComponent(q)}`
  if (geneSymbol) {
    searchUrl += `&gene=${encodeURIComponent(geneSymbol)}`
  }
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CPIC')
  const searchData = await searchRes.json()
  const recommendations = searchData?.results || searchData || []
  const grouped = new Map<string, CPICGuideline>()
  for (const rec of recommendations) {
    const key = `${rec.drugName || rec.drug_name || q}-${rec.gene || ''}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: String(rec.guidelineId || rec.guideline_id || ''),
        drugName: String(rec.drugName || rec.drug_name || q),
        drugClass: String(rec.drugClass || rec.drug_class || ''),
        gene: String(rec.gene || ''),
        guidelineId: String(rec.guidelineId || rec.guideline_id || ''),
        lastUpdated: String(rec.lastUpdated || rec.last_updated || ''),
        url: `https://cpicpgx.org/guidelines/guideline-for-${rec.drug_name || q}/`,
        recommendations: [],
      })
    }
    const guideline = grouped.get(key)!
    guideline.recommendations.push(formatRecommendation(rec))
  }
  return Array.from(grouped.values())
}

/**
 * Get all CPIC guidelines for a gene
 */
export async function getCPICGuidelinesByGene(geneSymbol: string): Promise<CPICGuideline[]> {
  const q = geneSymbol.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/guideline?gene=${encodeURIComponent(q)}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'CPIC')
  const searchData = await searchRes.json()
  const guidelines = searchData?.results || searchData?.guidelines || []
  return guidelines.map((g: Record<string, unknown>) => ({
    id: String(g.id || ''),
    drugName: String(g.drugName || g.drug_name || g.drug || ''),
    drugClass: String(g.drugClass || g.drug_class || ''),
    gene: q,
    guidelineId: String(g.guidelineId || g.guideline_id || ''),
    lastUpdated: String(g.lastUpdated || g.last_updated || ''),
    url: `https://cpicpgx.org/guidelines/guideline-for-${g.id || ''}/`,
    recommendations: Array.isArray(g.recommendations) ? g.recommendations.map(formatRecommendation) : [],
  }))
}

/**
 * Get comprehensive CPIC data for a drug.
 * Same-source fallback: guidelines first, then recommendations.
 * HTTP / network failures throw so Discover cannot treat a down CPIC as empty.
 */
export async function getCPICData(drugName: string): Promise<CPICGuideline[]> {
  const guidelines = await searchCPICGuidelines(drugName, 50)
  if (guidelines.length === 0) {
    return await getCPICRecommendations(drugName)
  }
  return guidelines
}