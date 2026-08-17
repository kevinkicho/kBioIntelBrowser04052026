// FDA Drug Shortages API Client
// https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages
// Current drug shortage database

import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

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
 * FDA Drug Shortages harvest leaf (openFDA). HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404 (no matches), and zero-hit JSON remain empty.
 */
function isAbsentStatus(status: number): boolean {
  // openFDA returns 404 when a drug name has no shortage matches.
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

function mapShortage(r: Record<string, unknown>): DrugShortage {
  return {
    id: String(r.id ?? ''),
    drugName: String(r.drug_name ?? ''),
    genericName: String(r.generic_name ?? ''),
    company: String(r.company ?? ''),
    shortageStatus: (r.shortage_status as DrugShortage['shortageStatus']) ?? 'Shortage',
    shortageType: String(r.shortage_type ?? ''),
    shortageReason: String(r.reason_for_shortage ?? ''),
    estimatedResupplyDate: r.estimated_resupply_date ? String(r.estimated_resupply_date) : undefined,
    shortageDuration: r.shortage_duration ? String(r.shortage_duration) : undefined,
    url: 'https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages',
  }
}

async function fetchShortages(url: string): Promise<{ results: Record<string, unknown>[]; total: number }> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return { results: [], total: 0 }
  throwIfHttpFailed(res, 'FDA drug shortages')
  const data = await res.json()
  return {
    results: Array.isArray(data.results) ? data.results : [],
    total: data.meta?.results?.total ?? 0,
  }
}

function apiKeyParam(): string {
  const apiKey = getApiKey('OPENFDA_API_KEY')
  return apiKey ? `&api_key=${apiKey}` : ''
}

/**
 * Search FDA drug shortages by drug name
 */
export async function searchDrugShortages(query: string): Promise<DrugShortageResponse> {
  const q = query.trim()
  if (!q) return { shortages: [], total: 0 }
  const url = `${BASE_URL}?search=${encodeURIComponent(q)}&limit=50${apiKeyParam()}`
  const data = await fetchShortages(url)
  return {
    shortages: data.results.map(mapShortage),
    total: data.total,
  }
}

/**
 * Get all current drug shortages
 */
export async function getAllDrugShortages(): Promise<DrugShortage[]> {
  const url = `${BASE_URL}?limit=100${apiKeyParam()}`
  const data = await fetchShortages(url)
  return data.results.map(mapShortage)
}

/**
 * Get shortages by company/manufacturer
 */
export async function getShortagesByCompany(company: string): Promise<DrugShortage[]> {
  const result = await searchDrugShortages(company)
  return result.shortages
}