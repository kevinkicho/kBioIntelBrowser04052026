// FDA Drug Shortages API Client
// https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages
// Current drug shortage database

const BASE_URL = 'https://api.fda.gov/drug/shortage.json'

const fetchOptions: RequestInit = {
  next: { revalidate: 3600 }, // Update hourly for shortages
}

export interface DrugShortage {
  id: string
  drugName: string
  genericName: string
  company: string
  shortageStatus: 'Shortage' | 'Resolved' | 'Ongoing'
  shortageType: string
  shortageReason: string
  estimatedResupplyDate?: string
  shortageDuration?: string
  url: string
}

export interface DrugShortageResponse {
  shortages: DrugShortage[]
  total: number
}

/**
 * Search FDA drug shortages by drug name
 */
export async function searchDrugShortages(query: string): Promise<DrugShortageResponse> {
  try {
    const searchTerm = encodeURIComponent(query)
    const url = `${BASE_URL}?search=${searchTerm}&limit=50`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('FDA shortage search failed')
    const data = await res.json()

    return {
      shortages: (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id ?? '',
        drugName: r.drug_name ?? '',
        genericName: r.generic_name ?? '',
        company: r.company ?? '',
        shortageStatus: r.shortage_status ?? 'Unknown',
        shortageType: r.shortage_type ?? '',
        shortageReason: r.reason_for_shortage ?? '',
        estimatedResupplyDate: r.estimated_resupply_date,
        shortageDuration: r.shortage_duration,
        url: `https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages`,
      })),
      total: data.meta?.results?.total ?? 0,
    }
  } catch {
    return { shortages: [], total: 0 }
  }
}

/**
 * Get all current drug shortages
 */
export async function getAllDrugShortages(): Promise<DrugShortage[]> {
  try {
    const url = `${BASE_URL}?limit=100`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('FDA shortages request failed')
    const data = await res.json()

    return (data.results ?? []).map((r: Record<string, unknown>) => ({
      id: r.id ?? '',
      drugName: r.drug_name ?? '',
      genericName: r.generic_name ?? '',
      company: r.company ?? '',
      shortageStatus: r.shortage_status ?? 'Unknown',
      shortageType: r.shortage_type ?? '',
      shortageReason: r.reason_for_shortage ?? '',
      estimatedResupplyDate: r.estimated_resupply_date,
      shortageDuration: r.shortage_duration,
      url: `https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages`,
    }))
  } catch {
    return []
  }
}

/**
 * Get shortages by company/manufacturer
 */
export async function getShortagesByCompany(company: string): Promise<DrugShortage[]> {
  try {
    const result = await searchDrugShortages(company)
    return result.shortages
  } catch {
    return []
  }
}
