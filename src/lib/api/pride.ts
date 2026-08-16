import type { PRIDEProject } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://www.ebi.ac.uk/pride/ws/archive'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * PRIDE harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, and zero-hit JSON remain empty.
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

function mapProject(project: Record<string, unknown>, accessionFallback = ''): PRIDEProject {
  const accession = String(project.accession || accessionFallback || '')
  return {
    accession,
    title: String(project.title || ''),
    description: String(project.description || project.projectDescription || ''),
    species: String(project.species || project.organism || ''),
    tissue: String(project.tissue || ''),
    instrument: String(project.instrument || ''),
    ptm: String(project.ptm || project.modification || ''),
    disease: String(project.disease || ''),
    submitter: String(project.submitter || project.submitterName || ''),
    publicationDate: String(project.publicationDate || project.submissionDate || ''),
    numProteins: parseInt(String(project.numProteins || project.numProteinsIdentified || '0'), 10),
    numPeptides: parseInt(String(project.numPeptides || '0'), 10),
    numSpectra: parseInt(String(project.numSpectra || '0'), 10),
    url: `https://www.ebi.ac.uk/pride/archive/projects/${accession}`,
  }
}

/**
 * Search PRIDE Archive for proteomics projects by protein/gene
 */
export async function searchPRIDE(query: string, limit: number = LIMITS.PRIDE.initial): Promise<PRIDEProject[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(q)}&pageSize=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'PRIDE')
  const searchData = await searchRes.json()
  const projects = searchData?._embedded?.projects || []
  return projects
    .map((project: Record<string, unknown>) => mapProject(project))
    .filter((p: PRIDEProject) => p.accession && p.title)
}

/**
 * Get PRIDE project details by accession
 */
export async function getPRIDEProject(accession: string): Promise<PRIDEProject | null> {
  const id = accession.trim()
  if (!id) return null
  const projectUrl = `${BASE_URL}/project/${id}`
  const projectRes = await timedFetch(projectUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(projectRes.status)) return null
  throwIfHttpFailed(projectRes, 'PRIDE')
  const project = await projectRes.json()
  return mapProject(project as Record<string, unknown>, id)
}

/**
 * Get PRIDE datasets for a project
 */
export async function getPRIDEDatasets(accession: string, limit: number = LIMITS.PRIDE.initial): Promise<{
  datasetId: string
  accession: string
  fileName: string
  fileSize: number
  fileType: string
  assayType: string
  species: string
  tissue: string
  url: string
}[]> {
  const id = accession.trim()
  if (!id) return []
  const datasetsUrl = `${BASE_URL}/project/${id}/datasets?pageSize=${limit}`
  const datasetsRes = await timedFetch(datasetsUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(datasetsRes.status)) return []
  throwIfHttpFailed(datasetsRes, 'PRIDE')
  const datasetsData = await datasetsRes.json()
  const datasets = datasetsData?._embedded?.datasets || []
  return datasets.map((dataset: Record<string, unknown>) => ({
    datasetId: String(dataset.id || ''),
    accession: id,
    fileName: String(dataset.fileName || dataset.name || ''),
    fileSize: parseInt(String(dataset.fileSize || '0'), 10),
    fileType: String(dataset.fileType || ''),
    assayType: String(dataset.assayType || ''),
    species: String(dataset.species || ''),
    tissue: String(dataset.tissue || ''),
    url: `https://www.ebi.ac.uk/pride/archive/files/${dataset.fileName}`,
  }))
}