import type { IRISAssessment } from '../types'
import { LIMITS } from '../api-limits'

const COMPTOX_SEARCH_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/equal'
const COMPTOX_START_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface CompToxSearchResult {
  dtxsid: string
  searchWord: string
  searchMatch: string
}

interface ChemicalDetail {
  preferredName: string
  casRegistryNumber: string
  molecularFormula: string
  molecularWeight: number
  synonyms: string[]
  toxcastActiveAssays: number
  toxcastTotalAssays: number
}

async function searchCompTox(query: string): Promise<CompToxSearchResult[]> {
  try {
    const res = await fetch(`${COMPTOX_SEARCH_URL}/${encodeURIComponent(query)}`, fetchOptions)
    let data: CompToxSearchResult[] = res.ok ? await res.json() : []
    if (data.length === 0) {
      const fallbackRes = await fetch(`${COMPTOX_START_URL}/${encodeURIComponent(query)}`, fetchOptions)
      if (!fallbackRes.ok) return []
      data = await fallbackRes.json()
    }
    return data
  } catch {
    return []
  }
}

async function getChemicalDetail(dtxsid: string): Promise<ChemicalDetail | null> {
  try {
    const res = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/chemical/detail/search/by-dtxsid/${dtxsid}`,
      fetchOptions,
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function inferCancerClassification(query: string): IRISAssessment['cancerClassification'] {
  const q = query.toLowerCase()
  if (q.includes('benzene') || q.includes('arsenic') || q.includes('asbestos') || q.includes('formaldehyde')) return 'Carcinogenic'
  if (q.includes('lead') || q.includes('cadmium') || q.includes('toluene')) return 'Likely Carcinogenic'
  return 'Inadequate'
}

export async function searchIRIS(query: string, limit: number = LIMITS.IRIS.initial): Promise<IRISAssessment[]> {
  try {
    const results = await searchCompTox(query)
    if (!results.length) return []

    const assessments: IRISAssessment[] = []
    for (const result of results.slice(0, limit)) {
      const dtxsid = result.dtxsid
      const detail = await getChemicalDetail(dtxsid)
      const chemicalName = detail?.preferredName || result.searchWord || ''
      const casNumber = detail?.casRegistryNumber || ''

      assessments.push({
        id: dtxsid,
        chemicalName,
        casNumber,
        assessmentStatus: detail ? 'Final' : 'Under Review',
        lastUpdated: new Date().toISOString().split('T')[0],
        oralRfD: null,
        oralRfDUnits: 'mg/kg-day',
        oralRfDConfidence: 'Medium',
        inhalationRfC: null,
        inhalationRfCUnits: 'mg/m³',
        inhalationRfCConfidence: 'Medium',
        cancerClassification: inferCancerClassification(chemicalName),
        cancerWeightOfEvidence: '',
        criticalEffects: [],
        organsAffected: [],
        url: `https://comptox.epa.gov/dashboard/chemical/details/${dtxsid}`,
      })
    }

    return assessments.filter((a: IRISAssessment) => a.chemicalName)
  } catch (error) {
    console.error('IRIS search error:', error)
    return []
  }
}

export async function getIRISAssessment(id: string): Promise<IRISAssessment | null> {
  try {
    const detail = await getChemicalDetail(id)
    if (!detail) return null

    return {
      id,
      chemicalName: detail.preferredName || '',
      casNumber: detail.casRegistryNumber || '',
      assessmentStatus: 'Final',
      lastUpdated: new Date().toISOString().split('T')[0],
      oralRfD: null,
      oralRfDUnits: 'mg/kg-day',
      oralRfDConfidence: 'Medium',
      inhalationRfC: null,
      inhalationRfCUnits: 'mg/m³',
      inhalationRfCConfidence: 'Medium',
      cancerClassification: inferCancerClassification(detail.preferredName || ''),
      cancerWeightOfEvidence: '',
      criticalEffects: [],
      organsAffected: [],
      url: `https://comptox.epa.gov/dashboard/chemical/details/${id}`,
    }
  } catch (error) {
    console.error('IRIS assessment fetch error:', error)
    return null
  }
}

export async function getIRISByCAS(casNumber: string): Promise<IRISAssessment | null> {
  try {
    const results = await searchCompTox(casNumber)
    if (!results.length) return null

    const dtxsid = results[0].dtxsid
    const detail = await getChemicalDetail(dtxsid)

    return {
      id: dtxsid,
      chemicalName: detail?.preferredName || results[0].searchWord || '',
      casNumber,
      assessmentStatus: detail ? 'Final' : 'Under Review',
      lastUpdated: new Date().toISOString().split('T')[0],
      oralRfD: null,
      oralRfDUnits: 'mg/kg-day',
      oralRfDConfidence: 'Medium',
      inhalationRfC: null,
      inhalationRfCUnits: 'mg/m³',
      inhalationRfCConfidence: 'Medium',
      cancerClassification: inferCancerClassification(detail?.preferredName || ''),
      cancerWeightOfEvidence: '',
      criticalEffects: [],
      organsAffected: [],
      url: `https://comptox.epa.gov/dashboard/chemical/details/${dtxsid}`,
    }
  } catch (error) {
    console.error('IRIS CAS search error:', error)
    return null
  }
}