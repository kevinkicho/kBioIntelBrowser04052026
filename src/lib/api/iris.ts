import type { IRISAssessment } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://cfpub.epa.gov/ncea/iris/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search EPA IRIS for toxicological assessments
 * IRIS provides human health risk assessments for chemicals
 */
export async function searchIRIS(query: string, limit: number = LIMITS.IRIS.initial): Promise<IRISAssessment[]> {
  try {
    // IRIS API search endpoint
    const searchUrl = `${BASE_URL}/assessments?search=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const assessments = searchData?.data || searchData?.results || []

    return assessments.map((assessment: Record<string, unknown>) => ({
      id: String(assessment.id || assessment.assessment_id || ''),
      chemicalName: String(assessment.chemical_name || assessment.chemicalName || assessment.name || ''),
      casNumber: String(assessment.cas_number || assessment.casNumber || assessment.cas || ''),
      assessmentStatus: parseStatus(assessment.status || assessment.assessment_status || ''),
      lastUpdated: String(assessment.last_updated || assessment.lastUpdated || assessment.date || ''),
      oralRfD: assessment.oral_rfd || assessment.oralRfD ? Number(assessment.oral_rfd || assessment.oralRfD) : null,
      oralRfDUnits: String(assessment.oral_rfd_units || assessment.oralRfDUnits || 'mg/kg-day'),
      oralRfDConfidence: parseConfidence(assessment.oral_rfd_confidence || assessment.oralRfDConfidence),
      inhalationRfC: assessment.inhalation_rfc || assessment.inhalationRfC ? Number(assessment.inhalation_rfc || assessment.inhalationRfC) : null,
      inhalationRfCUnits: String(assessment.inhalation_rfc_units || assessment.inhalationRfCUnits || 'mg/m³'),
      inhalationRfCConfidence: parseConfidence(assessment.inhalation_rfc_confidence || assessment.inhalationRfCConfidence),
      cancerClassification: parseCancerClass(assessment.cancer_classification || assessment.cancerClass || ''),
      cancerWeightOfEvidence: String(assessment.cancer_weight_of_evidence || assessment.cancerWeightOfEvidence || ''),
      criticalEffects: Array.isArray(assessment.critical_effects) ? assessment.critical_effects.map(String) : [],
      organsAffected: Array.isArray(assessment.organs_affected) ? assessment.organs_affected.map(String) : Array.isArray(assessment.organsAffected) ? assessment.organsAffected.map(String) : [],
      url: `https://cfpub.epa.gov/ncea/iris/iris_documents/documentsubdocs/${assessment.id || assessment.assessment_id}/`,
    })).filter((a: IRISAssessment) => a.chemicalName)
  } catch (error) {
    console.error('IRIS search error:', error)
    return []
  }
}

/**
 * Get IRIS assessment by ID
 */
export async function getIRISAssessment(id: string): Promise<IRISAssessment | null> {
  try {
    const assessmentUrl = `${BASE_URL}/assessment/${id}`
    const assessmentRes = await fetch(assessmentUrl, fetchOptions)
    if (!assessmentRes.ok) return null

    const assessment = await assessmentRes.json()

    return {
      id: assessment.id || id,
      chemicalName: assessment.chemical_name || assessment.chemicalName || assessment.name || '',
      casNumber: assessment.cas_number || assessment.casNumber || assessment.cas || '',
      assessmentStatus: parseStatus(assessment.status || assessment.assessment_status || ''),
      lastUpdated: assessment.last_updated || assessment.lastUpdated || assessment.date || '',
      oralRfD: assessment.oral_rfd || assessment.oralRfD ? Number(assessment.oral_rfd || assessment.oralRfD) : null,
      oralRfDUnits: assessment.oral_rfd_units || assessment.oralRfDUnits || 'mg/kg-day',
      oralRfDConfidence: parseConfidence(assessment.oral_rfd_confidence || assessment.oralRfDConfidence),
      inhalationRfC: assessment.inhalation_rfc || assessment.inhalationRfC ? Number(assessment.inhalation_rfc || assessment.inhalationRfC) : null,
      inhalationRfCUnits: assessment.inhalation_rfc_units || assessment.inhalationRfCUnits || 'mg/m³',
      inhalationRfCConfidence: parseConfidence(assessment.inhalation_rfc_confidence || assessment.inhalationRfCConfidence),
      cancerClassification: parseCancerClass(assessment.cancer_classification || assessment.cancerClass || ''),
      cancerWeightOfEvidence: assessment.cancer_weight_of_evidence || assessment.cancerWeightOfEvidence || '',
      criticalEffects: Array.isArray(assessment.critical_effects) ? assessment.critical_effects.map(String) : [],
      organsAffected: Array.isArray(assessment.organs_affected) ? assessment.organs_affected.map(String) : Array.isArray(assessment.organsAffected) ? assessment.organsAffected.map(String) : [],
      url: `https://cfpub.epa.gov/ncea/iris/iris_documents/documentsubdocs/${id}/`,
    }
  } catch (error) {
    console.error('IRIS assessment fetch error:', error)
    return null
  }
}

/**
 * Search IRIS by CAS number
 */
export async function getIRISByCAS(casNumber: string): Promise<IRISAssessment | null> {
  try {
    const searchUrl = `${BASE_URL}/assessments?cas=${encodeURIComponent(casNumber)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    const assessments = searchData?.data || searchData?.results || []

    if (assessments.length === 0) return null

    // Return the first matching assessment
    const assessment = assessments[0]
    return {
      id: String(assessment.id || assessment.assessment_id || ''),
      chemicalName: String(assessment.chemical_name || assessment.chemicalName || assessment.name || ''),
      casNumber: casNumber,
      assessmentStatus: parseStatus(assessment.status || assessment.assessment_status || ''),
      lastUpdated: String(assessment.last_updated || assessment.lastUpdated || assessment.date || ''),
      oralRfD: assessment.oral_rfd || assessment.oralRfD ? Number(assessment.oral_rfd || assessment.oralRfD) : null,
      oralRfDUnits: String(assessment.oral_rfd_units || assessment.oralRfDUnits || 'mg/kg-day'),
      oralRfDConfidence: parseConfidence(assessment.oral_rfd_confidence || assessment.oralRfDConfidence),
      inhalationRfC: assessment.inhalation_rfc || assessment.inhalationRfC ? Number(assessment.inhalation_rfc || assessment.inhalationRfC) : null,
      inhalationRfCUnits: String(assessment.inhalation_rfc_units || assessment.inhalationRfCUnits || 'mg/m³'),
      inhalationRfCConfidence: parseConfidence(assessment.inhalation_rfc_confidence || assessment.inhalationRfCConfidence),
      cancerClassification: parseCancerClass(assessment.cancer_classification || assessment.cancerClass || ''),
      cancerWeightOfEvidence: String(assessment.cancer_weight_of_evidence || assessment.cancerWeightOfEvidence || ''),
      criticalEffects: Array.isArray(assessment.critical_effects) ? assessment.critical_effects.map(String) : [],
      organsAffected: Array.isArray(assessment.organs_affected) ? assessment.organs_affected.map(String) : Array.isArray(assessment.organsAffected) ? assessment.organsAffected.map(String) : [],
      url: `https://cfpub.epa.gov/ncea/iris/iris_documents/documentsubdocs/${assessment.id || assessment.assessment_id}/`,
    }
  } catch (error) {
    console.error('IRIS CAS search error:', error)
    return null
  }
}

function parseStatus(status: unknown): IRISAssessment['assessmentStatus'] {
  const s = String(status).toLowerCase()
  if (s.includes('final') || s.includes('complete')) return 'Final'
  if (s.includes('review') || s.includes('under')) return 'Under Review'
  if (s.includes('development') || s.includes('draft')) return 'Development'
  return 'Final'
}

function parseConfidence(confidence: unknown): 'High' | 'Medium' | 'Low' {
  const c = String(confidence).toLowerCase()
  if (c.includes('high')) return 'High'
  if (c.includes('medium') || c.includes('moderate')) return 'Medium'
  if (c.includes('low')) return 'Low'
  return 'Medium'
}

function parseCancerClass(classification: unknown): IRISAssessment['cancerClassification'] {
  const c = String(classification).toLowerCase()
  if (c.includes('carcinogenic') && !c.includes('likely') && !c.includes('suggestive')) return 'Carcinogenic'
  if (c.includes('likely')) return 'Likely Carcinogenic'
  if (c.includes('suggestive')) return 'Suggestive'
  if (c.includes('inadequate')) return 'Inadequate'
  if (c.includes('not likely')) return 'Not Likely'
  return 'Inadequate'
}