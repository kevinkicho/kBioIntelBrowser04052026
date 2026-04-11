// BioModels API Client
// https://www.biomodels.org/
// 3,000+ computational biology models (SBML, CellML)

const BASE_URL = 'https://www.ebi.ac.uk/biomodels'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
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

/**
 * Search BioModels by keyword
 */
export async function searchBioModels(query: string, limit = 20): Promise<BioModelsSearchResponse> {
  try {
    const params = new URLSearchParams({
      query: query,
      format: 'json',
      limit: limit.toString(),
    })
    const url = `${BASE_URL}/api/v2/models/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('BioModels search failed')
    const data = await res.json()

    return {
      models: (data.models ?? []).map((m: Record<string, unknown>) => ({
        id: m.id ?? '',
        name: m.name ?? '',
        description: m.description ?? '',
        authors: m.authors ?? [],
        submitter: m.submitter ?? '',
        submitterDate: m.submitterDate ?? '',
        lastUpdate: m.lastUpdate ?? '',
        modelSize: m.modelSize ?? 0,
        formats: m.formats ?? [],
        organisms: m.organisms ?? [],
        url: `https://www.biomodels.org/${m.id}`,
      })),
      total: data.total ?? 0,
    }
  } catch {
    return { models: [], total: 0 }
  }
}

/**
 * Get model details by ID
 */
export async function getBioModelsModel(modelId: string): Promise<BioModelsModel | null> {
  try {
    const url = `${BASE_URL}/api/v2/models/${encodeURIComponent(modelId)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    return {
      id: data.id ?? '',
      name: data.name ?? '',
      description: data.description ?? '',
      authors: data.authors ?? [],
      submitter: data.submitter ?? '',
      submitterDate: data.submitterDate ?? '',
      lastUpdate: data.lastUpdate ?? '',
      modelSize: data.modelSize ?? 0,
      formats: data.formats ?? [],
      organisms: data.organisms ?? [],
      url: `https://www.biomodels.org/${modelId}`,
    }
  } catch {
    return null
  }
}

/**
 * Get model SBML content
 */
export async function getBioModelsSBML(modelId: string): Promise<string | null> {
  try {
    const url = `${BASE_URL}/api/v2/models/${encodeURIComponent(modelId)}/files/main.sbml`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

/**
 * Search models by organism
 */
export async function searchBioModelsByOrganism(organism: string): Promise<BioModelsModel[]> {
  try {
    const result = await searchBioModels(organism, 50)
    return result.models
  } catch {
    return []
  }
}
