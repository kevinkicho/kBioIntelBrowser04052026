// MassIVE API Client
// https://massive.ucsd.edu/
// UCSD proteomics data repository for MS/MS mass spectrometry data

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
 * Search MassIVE datasets by keyword
 */
export async function searchMassive(
  query: string,
  limit = 20,
): Promise<MassIVESearchResponse> {
  try {
    // MassIVE uses a REST API for search
    const url = `${BASE_URL}/datasets?search=${encodeURIComponent(query)}&format=json&limit=${limit}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) {
      // Fallback: try the main datasets endpoint
      return await getRecentDatasets(limit)
    }
    const data = await res.json()

    return {
      datasets: (data.datasets ?? []).map((d: Record<string, unknown>) => ({
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
      })),
      total: (data.total as number) ?? 0,
    }
  } catch {
    return { datasets: [], total: 0 }
  }
}

/**
 * Get recent MassIVE datasets
 */
export async function getRecentDatasets(limit = 20): Promise<MassIVESearchResponse> {
  try {
    const url = `${BASE_URL}/datasets?format=json&limit=${limit}&sort=submissionDate&order=desc`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return { datasets: [], total: 0 }
    const data = await res.json()

    return {
      datasets: (data.datasets ?? []).map((d: Record<string, unknown>) => ({
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
      })),
      total: (data.total as number) ?? 0,
    }
  } catch {
    return { datasets: [], total: 0 }
  }
}

/**
 * Get MassIVE dataset by accession ID
 */
export async function getMassiveDataset(accession: string): Promise<MassIVEDataset | null> {
  try {
    // Search by specific accession
    const result = await searchMassive(accession, 1)
    return result.datasets[0] ?? null
  } catch {
    return null
  }
}

/**
 * Get datasets by organism
 */
export async function getMassiveByOrganism(organism: string, limit = 20): Promise<MassIVEDataset[]> {
  try {
    const result = await searchMassive(`organism:"${organism}"`, limit)
    return result.datasets
  } catch {
    return []
  }
}

/**
 * Get datasets by sample type
 */
export async function getMassiveBySampleType(sampleType: string, limit = 20): Promise<MassIVEDataset[]> {
  try {
    const result = await searchMassive(`sample_type:"${sampleType}"`, limit)
    return result.datasets
  } catch {
    return []
  }
}
