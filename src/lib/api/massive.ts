// MassIVE API Client
// https://massive.ucsd.edu/
// UCSD proteomics data repository for MS/MS mass spectrometry data

import { timedFetch } from './timedFetch'

const BASE_URL = 'https://massive.ucsd.edu/ProteoSAFe'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface MassIVEDataset {
  id: string
  title: string
  description: string
  doi: string
  submitter: string
  submissionDate: string
  updateDate: string
  organism: string
  instrumentType: string
  datasetType: string
  sampleType: string
  lab: string
  contactName: string
  contactEmail: string
  publication?: string
  pubmedId?: string
  fileCount: number
  fileSize: number
  url: string
}

export interface MassIVESearchResponse {
  datasets: MassIVEDataset[]
  total: number
}

/**
 * MassIVE harvest leaf. HTTP / HTML / timeout / network are not EMPTY
 * after the recent-datasets fallback. Blank query, 404, and zero-hit JSON stay empty.
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

function mapDataset(d: Record<string, unknown>): MassIVEDataset {
  return {
    id: (d.id as string) ?? '',
    title: (d.title as string) ?? '',
    description: (d.description as string) ?? '',
    doi: (d.doi as string) ?? '',
    submitter: (d.submitter as string) ?? '',
    submissionDate: (d.submissionDate as string) ?? '',
    updateDate: (d.updateDate as string) ?? '',
    organism: (d.organism as string) ?? '',
    instrumentType: (d.instrumentType as string) ?? '',
    datasetType: (d.datasetType as string) ?? '',
    sampleType: (d.sampleType as string) ?? '',
    lab: (d.lab as string) ?? '',
    contactName: (d.contactName as string) ?? '',
    contactEmail: (d.contactEmail as string) ?? '',
    publication: (d.publication as string) ?? undefined,
    pubmedId: (d.pubmedId as string) ?? undefined,
    fileCount: (d.fileCount as number) ?? 0,
    fileSize: (d.fileSize as number) ?? 0,
    url: `https://massive.ucsd.edu/ProteoSAFe/dataset.jsp?accession=${d.id}`,
  }
}

function mapResponse(data: { datasets?: Record<string, unknown>[]; total?: number }): MassIVESearchResponse {
  return {
    datasets: (data.datasets ?? []).map(mapDataset),
    total: data.total ?? 0,
  }
}

async function fetchMassive(url: string): Promise<MassIVESearchResponse> {
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return { datasets: [], total: 0 }
  throwIfHttpFailed(res, 'MassIVE')
  const data = await res.json()
  return mapResponse(data)
}

/**
 * Search MassIVE datasets by keyword.
 * Search HTTP 5xx/timeout/network falls back to recent datasets; if that
 * also fails with HTTP/timeout/network, the error is not swallowed as EMPTY.
 */
export async function searchMassive(
  query: string,
  limit = 20,
): Promise<MassIVESearchResponse> {
  const q = query.trim()
  if (!q) return { datasets: [], total: 0 }
  const url = `${BASE_URL}/datasets?search=${encodeURIComponent(q)}&format=json&limit=${limit}`
  try {
    const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
    if (isAbsentStatus(res.status) || !res.ok) {
      return await getRecentDatasets(limit)
    }
    throwIfHttpFailed(res, 'MassIVE')
    const data = await res.json()
    return mapResponse(data)
  } catch (err) {
    try {
      return await getRecentDatasets(limit)
    } catch {
      throw err
    }
  }
}

/**
 * Get recent MassIVE datasets
 */
export async function getRecentDatasets(limit = 20): Promise<MassIVESearchResponse> {
  const url = `${BASE_URL}/datasets?format=json&limit=${limit}&sort=submissionDate&order=desc`
  return fetchMassive(url)
}

/**
 * Get MassIVE dataset by accession ID
 */
export async function getMassiveDataset(accession: string): Promise<MassIVEDataset | null> {
  const result = await searchMassive(accession, 1)
  return result.datasets[0] ?? null
}

/**
 * Get datasets by organism
 */
export async function getMassiveByOrganism(organism: string, limit = 20): Promise<MassIVEDataset[]> {
  const result = await searchMassive(`organism:"${organism}"`, limit)
  return result.datasets
}

/**
 * Get datasets by sample type
 */
export async function getMassiveBySampleType(sampleType: string, limit = 20): Promise<MassIVEDataset[]> {
  const result = await searchMassive(`sample_type:"${sampleType}"`, limit)
  return result.datasets
}
