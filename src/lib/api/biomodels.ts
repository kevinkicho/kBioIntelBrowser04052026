// BioModels API Client
// https://www.biomodels.org/
// 3,000+ computational biology models (SBML, CellML)

import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.ebi.ac.uk/biomodels'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

/**
 * BioModels harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains { models: [], total: 0 } / [] / null.
 */
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

export interface BioModelsModel {
  id: string
  name: string
  description: string
  authors: string[]
  submitter: string
  submitterDate: string
  lastUpdate: string
  modelSize: number
  formats: string[]
  organisms: string[]
  url: string
}

export interface BioModelsSearchResponse {
  models: BioModelsModel[]
  total: number
}

function mapModel(m: Record<string, unknown>, fallbackId = ''): BioModelsModel {
  const id = String(m.id ?? fallbackId)
  return {
    id,
    name: String(m.name ?? ''),
    description: String(m.description ?? ''),
    authors: Array.isArray(m.authors) ? m.authors.map(String) : [],
    submitter: String(m.submitter ?? ''),
    submitterDate: String(m.submitterDate ?? ''),
    lastUpdate: String(m.lastUpdate ?? ''),
    modelSize: Number(m.modelSize ?? 0),
    formats: Array.isArray(m.formats) ? m.formats.map(String) : [],
    organisms: Array.isArray(m.organisms) ? m.organisms.map(String) : [],
    url: `https://www.biomodels.org/${id}`,
  }
}

/**
 * Search BioModels by keyword
 */
export async function searchBioModels(query: string, limit = 20): Promise<BioModelsSearchResponse> {
  const q = (query || '').trim()
  if (!q) return { models: [], total: 0 }

  const params = new URLSearchParams({
    query: q,
    format: 'json',
    limit: limit.toString(),
  })
  const url = `${BASE_URL}/api/v2/models/search?${params}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'BioModels')
  const data = await res.json()

  return {
    models: (data.models ?? []).map((m: Record<string, unknown>) => mapModel(m)),
    total: data.total ?? 0,
  }
}

/**
 * Get model details by ID
 */
export async function getBioModelsModel(modelId: string): Promise<BioModelsModel | null> {
  const id = (modelId || '').trim()
  if (!id) return null

  const url = `${BASE_URL}/api/v2/models/${encodeURIComponent(id)}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'BioModels')
  const data = await res.json()
  if (!data || typeof data !== 'object') return null
  return mapModel(data as Record<string, unknown>, id)
}

/**
 * Get model SBML content
 */
export async function getBioModelsSBML(modelId: string): Promise<string | null> {
  const id = (modelId || '').trim()
  if (!id) return null

  const url = `${BASE_URL}/api/v2/models/${encodeURIComponent(id)}/files/main.sbml`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'BioModels')
  return await res.text()
}

/**
 * Search models by organism
 */
export async function searchBioModelsByOrganism(organism: string): Promise<BioModelsModel[]> {
  const result = await searchBioModels(organism, 50)
  return result.models
}
