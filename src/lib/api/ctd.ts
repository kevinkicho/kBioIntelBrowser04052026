import type { CTDInteraction, CTDDiseaseAssociation } from '../types'

const BASE_URL = 'http://ctdbase.org'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search CTD for chemical-gene interactions
 */
export async function getChemicalGeneInteractions(chemicalName: string): Promise<CTDInteraction[]> {
  try {
    // CTD has a REST-ish API through their reports
    const url = `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_gene_interaction.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    // CTD returns data in a specific format
    const rows = data.data ?? []

    return rows.slice(0, 30).map((row: string[]) => ({
      chemicalName: row[0] ?? '',
      chemicalId: row[1] ?? '',
      geneSymbol: row[2] ?? '',
      geneId: row[3] ?? '',
      interaction: row[4] ?? '',
      interactionActions: (row[5] ?? '').split('|'),
      pmids: (row[6] ?? '').split('|').slice(0, 5),
      source: 'CTD'
    }))
  } catch {
    return []
  }
}

/**
 * Search CTD for gene-disease associations
 */
export async function getGeneDiseaseAssociations(geneSymbol: string): Promise<CTDDiseaseAssociation[]> {
  try {
    const url = `${BASE_URL}/reports/gene_${encodeURIComponent(geneSymbol)}_disease.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const rows = data.data ?? []

    return rows.slice(0, 30).map((row: string[]) => ({
      diseaseName: row[0] ?? '',
      diseaseId: row[1] ?? '',
      geneSymbol: geneSymbol,
      geneId: row[2] ?? '',
      inferenceScore: parseFloat(row[3] ?? '0'),
      pmids: (row[4] ?? '').split('|').slice(0, 5),
      source: 'CTD'
    }))
  } catch {
    return []
  }
}

/**
 * Search CTD for chemical-disease associations
 */
export async function getChemicalDiseaseAssociations(chemicalName: string): Promise<CTDDiseaseAssociation[]> {
  try {
    const url = `${BASE_URL}/reports/chemical_${encodeURIComponent(chemicalName)}_disease.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const rows = data.data ?? []

    return rows.slice(0, 30).map((row: string[]) => ({
      diseaseName: row[0] ?? '',
      diseaseId: row[1] ?? '',
      geneSymbol: '',
      geneId: '',
      chemicalName: chemicalName,
      chemicalId: row[2] ?? '',
      inferenceScore: parseFloat(row[3] ?? '0'),
      pmids: (row[4] ?? '').split('|').slice(0, 5),
      source: 'CTD'
    }))
  } catch {
    return []
  }
}

/**
 * Main export: Get CTD data
 */
export async function getCTDData(name: string, isGene: boolean = false): Promise<{
  interactions: CTDInteraction[]
  diseaseAssociations: CTDDiseaseAssociation[]
}> {
  const [interactions, diseaseAssociations] = await Promise.all([
    isGene ? Promise.resolve([]) : getChemicalGeneInteractions(name),
    getGeneDiseaseAssociations(name)
  ])

  return {
    interactions,
    diseaseAssociations
  }
}