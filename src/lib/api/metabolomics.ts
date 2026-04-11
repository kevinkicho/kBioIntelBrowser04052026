import type { MetaboliteData, MetabolomicsStudy } from '../types'

const BASE_URL = 'https://www.metabolomicsworkbench.org/rest'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * Search metabolites by name or synonym
 */
export async function searchMetabolitesByName(name: string): Promise<MetaboliteData[]> {
  try {
    // Use RefMet search which supports name/synonym matching
    const url = `${BASE_URL}/refmet/name/${encodeURIComponent(name)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: Record<string, string>) => ({
      refmetName: item.REFMET_NAME,
      formula: item.FORMULA,
      exactMass: parseFloat(item.EXACT_MASS) || 0,
      mainClass: item.MAIN_CLASS,
      subClass: item.SUB_CLASS,
      hmdbId: item.HMDB_ID,
      pubchemCid: item.PUBCHEM_CID ? parseInt(item.PUBCHEM_CID) : undefined,
      keggId: item.KEGG_ID,
      chebiId: item.CHEBI_ID,
      inchi: item.INCHI,
      inchiKey: item.INCHIKEY,
    }))
  } catch {
    return []
  }
}

/**
 * Search metabolites by mass (with tolerance)
 */
export async function searchMetabolitesByMass(
  mass: number,
  tolerance: number = 0.01
): Promise<MetaboliteData[]> {
  try {
    const url = `${BASE_URL}/moverz/REFMET/${mass}/M+H/${tolerance}/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: Record<string, string>) => ({
      refmetName: item.REFMET_NAME,
      formula: item.FORMULA,
      exactMass: parseFloat(item.EXACT_MASS) || 0,
      mainClass: item.MAIN_CLASS,
      subClass: item.SUB_CLASS,
      hmdbId: item.HMDB_ID,
      pubchemCid: item.PUBCHEM_CID ? parseInt(item.PUBCHEM_CID) : undefined,
      keggId: item.KEGG_ID,
      chebiId: item.CHEBI_ID,
      inchi: item.INCHI,
      inchiKey: item.INCHIKEY,
    }))
  } catch {
    return []
  }
}

/**
 * Get study summary by study ID
 */
export async function getStudySummary(studyId: string): Promise<MetabolomicsStudy | null> {
  try {
    const url = `${BASE_URL}/study/study_id/${studyId}/summary/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    return {
      studyId: data.STUDY_ID,
      title: data.STUDY_TITLE,
      description: data.STUDY_DESCRIPTION,
      metabolites: parseInt(data.NUM_METABOLITES) || 0,
      samples: parseInt(data.NUM_SAMPLES) || 0,
      organisms: data.ORGANISMS ? data.ORGANISMS.split(',') : [],
      doi: data.STUDY_DOI,
    }
  } catch {
    return null
  }
}

/**
 * Search studies by metabolite name
 */
export async function searchStudiesByMetabolite(metaboliteName: string): Promise<MetabolomicsStudy[]> {
  try {
    const url = `${BASE_URL}/study/metabolite/${encodeURIComponent(metaboliteName)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.data ?? []).map((item: Record<string, string>) => ({
      studyId: item.STUDY_ID,
      title: item.STUDY_TITLE,
      description: item.STUDY_DESCRIPTION,
      metabolites: parseInt(item.NUM_METABOLITES) || 0,
      samples: parseInt(item.NUM_SAMPLES) || 0,
      organisms: item.ORGANISMS ? item.ORGANISMS.split(',') : [],
      doi: item.STUDY_DOI,
    }))
  } catch {
    return []
  }
}

/**
 * Get metabolite details by RefMet name
 */
export async function getMetaboliteDetails(refmetName: string): Promise<MetaboliteData | null> {
  try {
    const url = `${BASE_URL}/refmet/name/${encodeURIComponent(refmetName)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const item = data.data?.[0]

    if (!item) return null

    return {
      refmetName: item.REFMET_NAME,
      formula: item.FORMULA,
      exactMass: parseFloat(item.EXACT_MASS) || 0,
      mainClass: item.MAIN_CLASS,
      subClass: item.SUB_CLASS,
      hmdbId: item.HMDB_ID,
      pubchemCid: item.PUBCHEM_CID ? parseInt(item.PUBCHEM_CID) : undefined,
      keggId: item.KEGG_ID,
      chebiId: item.CHEBI_ID,
      inchi: item.INCHI,
      inchiKey: item.INCHIKEY,
    }
  } catch {
    return null
  }
}

/**
 * Main export: Get comprehensive metabolomics data
 */
export async function getMetabolomicsData(moleculeName: string, molecularWeight?: number): Promise<{
  metabolites: MetaboliteData[]
  studies: MetabolomicsStudy[]
} | null> {
  const [metabolites, studies] = await Promise.all([
    searchMetabolitesByName(moleculeName),
    searchStudiesByMetabolite(moleculeName)
  ])

  // If no direct matches and molecular weight provided, try mass search
  let massBasedMetabolites: MetaboliteData[] = []
  if (metabolites.length === 0 && molecularWeight) {
    massBasedMetabolites = await searchMetabolitesByMass(molecularWeight, 0.5)
  }

  const allMetabolites = [...metabolites, ...massBasedMetabolites].filter(
    (v, i, a) => a.findIndex(x => x.refmetName === v.refmetName) === i
  )

  if (allMetabolites.length === 0 && studies.length === 0) {
    return null
  }

  return {
    metabolites: allMetabolites.slice(0, 20), // Limit results
    studies: studies.slice(0, 10)
  }
}
