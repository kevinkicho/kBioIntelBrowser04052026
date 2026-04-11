import type { CompToxData } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getCompToxByName(name: string): Promise<CompToxData | null> {
  try {
    const searchRes = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/search/chemical/start-with/${encodeURIComponent(name)}`,
      fetchOptions,
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const firstResult = Array.isArray(searchData) ? searchData[0] : null
    if (!firstResult) return null
    const dtxsid: string = firstResult.dtxsid ?? firstResult.id ?? ''
    if (!dtxsid) return null

    const detailRes = await fetch(
      `https://comptox.epa.gov/dashboard-api/ccdapp1/chemical/detail/search/by-dtxsid/${dtxsid}`,
      fetchOptions,
    )
    if (!detailRes.ok) return null
    const detail = await detailRes.json()

    return {
      dtxsid,
      chemicalName: detail.preferredName ?? detail.synonyms?.[0] ?? '',
      casrn: detail.casRegistryNumber ?? '',
      casNumber: detail.casRegistryNumber ?? '',
      molecularFormula: detail.molecularFormula ?? '',
      molecularWeight: Number(detail.molecularWeight) || 0,
      structureUrl: '',
      synonyms: detail.synonyms ?? [],
      toxcastActive: Number(detail.toxcastActiveAssays) || 0,
      toxcastTotal: Number(detail.toxcastTotalAssays) || 0,
      exposurePrediction: detail.expocast ?? '',
      url: `https://comptox.epa.gov/dashboard/chemical/details/${dtxsid}`,
    }
  } catch {
    return null
  }
}
