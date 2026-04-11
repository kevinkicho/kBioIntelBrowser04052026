import type { ToxCastData, ToxCastAssay, ToxCastSummary } from '../types'

const BASE_URL = 'https://comptox.epa.gov/api'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search chemical by CASRN or name in EPA CompTox
 */
async function searchChemical(identifier: string): Promise<string | null> {
  try {
    // First try to get DTXSID from CompTox Dashboard API
    const url = `${BASE_URL}/chemicals/search?query=${encodeURIComponent(identifier)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    return data.results?.[0]?.dtxsid ?? null
  } catch {
    return null
  }
}

/**
 * Get ToxCast bioactivity data for a chemical
 */
async function getToxCastBioactivity(dtxsid: string): Promise<ToxCastAssay[]> {
  try {
    const url = `${BASE_URL}/toxcast/${dtxsid}/assays`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.assays ?? []).map((assay: Record<string, unknown>) => ({
      assayId: assay.assay_id as string,
      assayName: assay.assay_name as string,
      endpoint: assay.endpoint as string,
      outcome: assay.outcome as string,
      potencyValue: assay.potency_value as number | undefined,
      potencyUnit: assay.potency_unit as string,
      nConst: assay.n_const as number,
      nGain: assay.n_gain as number,
      nLoss: assay.n_loss as number,
    }))
  } catch {
    return []
  }
}

/**
 * Get ToxCast summary for a chemical
 */
async function getToxCastSummary(dtxsid: string): Promise<ToxCastSummary> {
  try {
    const url = `${BASE_URL}/toxcast/${dtxsid}/summary`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      return {
        totalAssays: 0,
        activeAssays: 0,
        inactiveAssays: 0,
        inconclusiveAssays: 0,
        topHitSubcategory: '',
      }
    }
    return res.json()
  } catch {
    return {
      totalAssays: 0,
      activeAssays: 0,
      inactiveAssays: 0,
      inconclusiveAssays: 0,
      topHitSubcategory: '',
    }
  }
}

/**
 * Get chemical name from DTXSID
 */
async function getChemicalName(dtxsid: string): Promise<string> {
  try {
    const url = `${BASE_URL}/chemicals/${dtxsid}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return dtxsid
    const data = await res.json()
    return data.preferred_name ?? dtxsid
  } catch {
    return dtxsid
  }
}

/**
 * Main export: Get comprehensive ToxCast data
 */
export async function getToxCastData(identifier: string): Promise<ToxCastData | null> {
  // Try to find DTXSID by CASRN or name
  const dtxsid = await searchChemical(identifier)
  if (!dtxsid) return null

  const [assays, summary, chemicalName] = await Promise.all([
    getToxCastBioactivity(dtxsid),
    getToxCastSummary(dtxsid),
    getChemicalName(dtxsid)
  ])

  return {
    casrn: identifier,
    dtxsid,
    chemicalName,
    assays,
    summary,
  }
}

/**
 * Get ToxCast data by DTXSID directly
 */
export async function getToxCastByDtxsid(dtxsid: string): Promise<ToxCastData | null> {
  const [assays, summary, chemicalName] = await Promise.all([
    getToxCastBioactivity(dtxsid),
    getToxCastSummary(dtxsid),
    getChemicalName(dtxsid)
  ])

  return {
    casrn: '',
    dtxsid,
    chemicalName,
    assays,
    summary,
  }
}

/**
 * Get assay details by assay ID
 */
export async function getAssayDetails(assayId: string): Promise<Record<string, unknown> | null> {
  try {
    const url = `${BASE_URL}/toxcast/assays/${assayId}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
