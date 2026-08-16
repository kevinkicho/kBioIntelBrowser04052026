// LIPID MAPS API Client
// https://www.lipidmaps.org/
// Standardized lipid nomenclature and structures (23K+ lipids)

import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.lipidmaps.org/rest'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface LipidMapsLipid {
  lmId: string
  name: string
  synonyms: string[]
  category: string
  mainClass: string
  subClass: string
  formula: string
  molecularWeight: number
  exactMass: number
  smiles?: string
  inchi?: string
  inchiKey?: string
  url: string
}

export interface LipidMapsSearchResponse {
  lipids: LipidMapsLipid[]
  total: number
}

/**
 * LIPID MAPS harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True 404 / zero-hit JSON remains [].
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

function mapLipid(r: Record<string, unknown>): LipidMapsLipid {
  return {
    lmId: (r.LM_ID as string) ?? '',
    name: (r.SYSTEMATIC_NAME as string) ?? (r.COMMON_NAME as string) ?? '',
    synonyms: [(r.COMMON_NAME as string), (r.SYNONYMS as string)].filter(Boolean).join('|').split('|'),
    category: (r.CATEGORY as string) ?? '',
    mainClass: (r.MAIN_CLASS as string) ?? '',
    subClass: (r.SUB_CLASS as string) ?? '',
    formula: (r.FORMULA as string) ?? '',
    molecularWeight: parseFloat(r.MOLECULAR_WEIGHT as string) || 0,
    exactMass: parseFloat(r.EXACT_MASS as string) || 0,
    smiles: (r.SMILES as string) ?? '',
    inchi: (r.INCHI as string) ?? '',
    inchiKey: (r.INCHI_KEY as string) ?? '',
    url: `https://www.lipidmaps.org/data/structure/${r.LM_ID}`,
  }
}

/**
 * Search LIPID MAPS by name or synonym
 */
export async function searchLipidMaps(query: string, limit = 20): Promise<LipidMapsSearchResponse> {
  const url = `${BASE_URL}/search?term=${encodeURIComponent(query)}&format=json&limit=${limit}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return { lipids: [], total: 0 }
  throwIfHttpFailed(res, 'LIPID MAPS')
  const data = await res.json()

  return {
    lipids: (data?.results ?? []).map((r: Record<string, unknown>) => mapLipid(r)),
    total: data?.total ?? 0,
  }
}

/**
 * Get lipid by LIPID MAPS ID
 */
export async function getLipidMapsLipid(lmId: string): Promise<LipidMapsLipid | null> {
  const result = await searchLipidMaps(lmId, 1)
  return result.lipids[0] ?? null
}

/**
 * Search lipids by formula
 */
export async function searchLipidsByFormula(formula: string): Promise<LipidMapsLipid[]> {
  const url = `${BASE_URL}/formula?term=${encodeURIComponent(formula)}&format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'LIPID MAPS')
  const data = await res.json()
  return (data?.results ?? []).map((r: Record<string, unknown>) => mapLipid(r))
}

/**
 * Get lipids by category
 */
export async function getLipidsByCategory(category: string): Promise<LipidMapsLipid[]> {
  const url = `${BASE_URL}/category/${encodeURIComponent(category)}?format=json`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'LIPID MAPS')
  const data = await res.json()
  return (data?.results ?? []).map((r: Record<string, unknown>) => mapLipid(r))
}