import type { PRIDEProject } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://www.ebi.ac.uk/pride/ws/archive'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search PRIDE Archive for proteomics projects by protein/gene
 */
export async function searchPRIDE(query: string, limit: number = LIMITS.PRIDE.initial): Promise<PRIDEProject[]> {
  try {
    const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(query)}&pageSize=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const projects = searchData?._embedded?.projects || []

    return projects.map((project: Record<string, unknown>) => ({
      accession: String(project.accession || ''),
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
      url: `https://www.ebi.ac.uk/pride/archive/projects/${project.accession}`,
    })).filter((p: PRIDEProject) => p.accession && p.title)
  } catch (error) {
    console.error('PRIDE search error:', error)
    return []
  }
}

/**
 * Get PRIDE project details by accession
 */
export async function getPRIDEProject(accession: string): Promise<PRIDEProject | null> {
  try {
    const projectUrl = `${BASE_URL}/project/${accession}`
    const projectRes = await fetch(projectUrl, fetchOptions)
    if (!projectRes.ok) return null

    const project = await projectRes.json()

    return {
      accession: project.accession || accession,
      title: project.title || '',
      description: project.description || project.projectDescription || '',
      species: project.species || project.organism || '',
      tissue: project.tissue || '',
      instrument: project.instrument || '',
      ptm: project.ptm || '',
      disease: project.disease || '',
      submitter: project.submitter || project.submitterName || '',
      publicationDate: project.publicationDate || project.submissionDate || '',
      numProteins: parseInt(String(project.numProteins || '0'), 10),
      numPeptides: parseInt(String(project.numPeptides || '0'), 10),
      numSpectra: parseInt(String(project.numSpectra || '0'), 10),
      url: `https://www.ebi.ac.uk/pride/archive/projects/${accession}`,
    }
  } catch (error) {
    console.error('PRIDE project fetch error:', error)
    return null
  }
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
  try {
    const datasetsUrl = `${BASE_URL}/project/${accession}/datasets?pageSize=${limit}`
    const datasetsRes = await fetch(datasetsUrl, fetchOptions)
    if (!datasetsRes.ok) return []

    const datasetsData = await datasetsRes.json()
    const datasets = datasetsData?._embedded?.datasets || []

    return datasets.map((dataset: Record<string, unknown>) => ({
      datasetId: String(dataset.id || ''),
      accession: accession,
      fileName: String(dataset.fileName || dataset.name || ''),
      fileSize: parseInt(String(dataset.fileSize || '0'), 10),
      fileType: String(dataset.fileType || ''),
      assayType: String(dataset.assayType || ''),
      species: String(dataset.species || ''),
      tissue: String(dataset.tissue || ''),
      url: `https://www.ebi.ac.uk/pride/archive/files/${dataset.fileName}`,
    }))
  } catch (error) {
    console.error('PRIDE datasets fetch error:', error)
    return []
  }
}