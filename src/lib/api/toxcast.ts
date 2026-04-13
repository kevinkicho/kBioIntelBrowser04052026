import type { ToxCastData, ToxCastAssay, ToxCastSummary } from '../types'

const COMPTOX_SEARCH_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/equal'
const COMPTOX_START_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with'
const COMPTOX_DETAIL_URL = 'https://comptox.epa.gov/dashboard-api/ccdapp1/chemical/detail/search/by-dtxsid'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

interface CompToxSearchResult {
  dtxsid: string
  dtxcid: string
  searchWord: string
  searchMatch: string
  rank: number
}

async function searchChemical(identifier: string): Promise<string | null> {
  try {
    let res = await fetch(`${COMPTOX_SEARCH_URL}/${encodeURIComponent(identifier)}`, fetchOptions)
    let data: CompToxSearchResult[] = res.ok ? await res.json() : []
    if (data.length === 0) {
      res = await fetch(`${COMPTOX_START_URL}/${encodeURIComponent(identifier)}`, fetchOptions)
      if (!res.ok) return null
      data = await res.json()
    }
    const match = data.find(r => r.searchWord.toLowerCase() === identifier.toLowerCase()) || data[0]
    return match?.dtxsid ?? null
  } catch {
    return null
  }
}

async function getChemicalDetail(dtxsid: string): Promise<{
  preferredName: string
  casRegistryNumber: string
  molecularFormula: string
  molecularWeight: number
  synonyms: string[]
  toxcastActiveAssays: number
  toxcastTotalAssays: number
} | null> {
  try {
    const res = await fetch(`${COMPTOX_DETAIL_URL}/${dtxsid}`, fetchOptions)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function getToxCastBioactivity(dtxsid: string): Promise<ToxCastAssay[]> {
  try {
    const res = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/toxcast/detail/by-dtxsid/${dtxsid}`,
      fetchOptions,
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.slice(0, 50).map((assay: Record<string, unknown>) => ({
      assayId: String(assay.assayId || assay.assay_id || assay.aeid || ''),
      assayName: String(assay.assayName || assay.assay_name || ''),
      endpoint: String(assay.endpoint || assay.assay_endpoint || ''),
      outcome: String(assay.hitCall || assay.outcome || assay.active || ''),
      potencyValue: Number(assay.ac50 || assay.potencyValue || assay.potency_value || 0),
      potencyUnit: String(assay.potencyUnit || assay.potency_unit || 'uM'),
      nConst: Number(assay.nConst || 0),
      nGain: Number(assay.nGain || 0),
      nLoss: Number(assay.nLoss || 0),
    }))
  } catch {
    return []
  }
}

function getDefaultSummary(totalAssays: number, activeAssays: number): ToxCastSummary {
  return {
    totalAssays,
    activeAssays,
    inactiveAssays: Math.max(0, totalAssays - activeAssays),
    inconclusiveAssays: 0,
    topHitSubcategory: '',
  }
}

export async function getToxCastData(identifier: string): Promise<ToxCastData | null> {
  const dtxsid = await searchChemical(identifier)
  if (!dtxsid) return null

  const detail = await getChemicalDetail(dtxsid)
  const chemicalName = detail?.preferredName || identifier

  const assays = await getToxCastBioactivity(dtxsid)

  if (assays.length === 0) return null

  const totalAssays = detail?.toxcastTotalAssays || assays.length
  const activeAssays = detail?.toxcastActiveAssays || assays.filter(a => a.outcome === 'Active' || a.outcome === '1' || a.outcome === 'true').length
  const summary = getDefaultSummary(totalAssays, activeAssays)

  return {
    casrn: detail?.casRegistryNumber || '',
    dtxsid,
    chemicalName,
    assays,
    summary,
  }
}

export async function getToxCastByDtxsid(dtxsid: string): Promise<ToxCastData | null> {
  const detail = await getChemicalDetail(dtxsid)
  const chemicalName = detail?.preferredName || dtxsid
  const assays = await getToxCastBioactivity(dtxsid)

  if (assays.length === 0) return null

  const totalAssays = detail?.toxcastTotalAssays || assays.length
  const activeAssays = detail?.toxcastActiveAssays || 0
  const summary = getDefaultSummary(totalAssays, activeAssays)

  return {
    casrn: detail?.casRegistryNumber || '',
    dtxsid,
    chemicalName,
    assays,
    summary,
  }
}

export async function getAssayDetails(assayId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/toxcast/assay/${assayId}`,
      fetchOptions,
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}