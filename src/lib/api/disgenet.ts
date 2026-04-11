import type { DisGeNetAssociation } from '../types'

const BASE_URL = 'https://api.disgenet.org/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Get gene-disease associations by gene symbol
 */
export async function getDiseasesByGene(geneSymbol: string): Promise<DisGeNetAssociation[]> {
  try {
    const url = `${BASE_URL}/gda?gene_symbol=${encodeURIComponent(geneSymbol)}&limit=50`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.response ?? []).map((item: Record<string, unknown>) => ({
      geneSymbol: item.gene_symbol as string,
      geneId: item.gene_id as string,
      diseaseId: item.disease_id as string,
      diseaseName: item.disease_name as string,
      diseaseType: item.disease_type as string,
      score: item.score as number,
      source: item.source as string,
      pmids: (item.pmids as string[] ?? []).slice(0, 5),
    }))
  } catch {
    return []
  }
}

/**
 * Get gene-disease associations by disease name
 */
export async function getGenesByDisease(diseaseName: string): Promise<DisGeNetAssociation[]> {
  try {
    const url = `${BASE_URL}/gda?disease_name=${encodeURIComponent(diseaseName)}&limit=50`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.response ?? []).map((item: Record<string, unknown>) => ({
      geneSymbol: item.gene_symbol as string,
      geneId: item.gene_id as string,
      diseaseId: item.disease_id as string,
      diseaseName: item.disease_name as string,
      diseaseType: item.disease_type as string,
      score: item.score as number,
      source: item.source as string,
      pmids: (item.pmids as string[] ?? []).slice(0, 5),
    }))
  } catch {
    return []
  }
}

/**
 * Main export: Get gene-disease associations for a molecule name
 */
export async function getDisGeNetData(name: string): Promise<{
  associations: DisGeNetAssociation[]
}> {
  const [geneAssociations] = await Promise.all([
    getDiseasesByGene(name)
  ])

  return {
    associations: geneAssociations.slice(0, 30)
  }
}