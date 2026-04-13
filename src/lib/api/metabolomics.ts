import type { MetaboliteData, MetabolomicsStudy } from '../types'

const BASE_URL = 'https://www.metabolomicsworkbench.org/rest'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function searchMetabolitesByName(name: string): Promise<MetaboliteData[]> {
  try {
    const url = `${BASE_URL}/refmet/name/${encodeURIComponent(name)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const items: Record<string, string>[] = Array.isArray(data) ? data : (data.data ?? [])

    return items.map((item: Record<string, string>) => ({
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

export async function searchMetabolitesByMass(
  mass: number,
  tolerance: number = 0.01
): Promise<MetaboliteData[]> {
  try {
    const url = `${BASE_URL}/moverz/REFMET/${mass}/M+H/${tolerance}/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const items: Record<string, string>[] = Array.isArray(data) ? data : (data.data ?? [])

    return items.map((item: Record<string, string>) => ({
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

export async function getStudySummary(studyId: string): Promise<MetabolomicsStudy | null> {
  try {
    const url = `${BASE_URL}/study/study_id/${studyId}/summary/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const study = (Array.isArray(data) ? data[0] : data) ?? data

    return {
      studyId: study.STUDY_ID,
      title: study.STUDY_TITLE,
      description: study.STUDY_DESCRIPTION,
      metabolites: parseInt(study.NUM_METABOLITES) || 0,
      samples: parseInt(study.NUM_SAMPLES) || 0,
      organisms: study.ORGANISMS ? study.ORGANISMS.split(',') : [],
      doi: study.STUDY_DOI,
    }
  } catch {
    return null
  }
}

export async function searchStudiesByMetabolite(metaboliteName: string): Promise<MetabolomicsStudy[]> {
  try {
    const url = `${BASE_URL}/study/metabolite/${encodeURIComponent(metaboliteName)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const items: Record<string, string>[] = Array.isArray(data) ? data : (data.data ?? [])

    return items.map((item: Record<string, string>) => ({
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

export async function getMetaboliteDetails(refmetName: string): Promise<MetaboliteData | null> {
  try {
    const url = `${BASE_URL}/refmet/name/${encodeURIComponent(refmetName)}/all/json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const items: Record<string, string>[] = Array.isArray(data) ? data : (data.data ?? [])
    const item = items[0]

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

export async function getMetabolomicsData(moleculeName: string, molecularWeight?: number): Promise<{
  metabolites: MetaboliteData[]
  studies: MetabolomicsStudy[]
} | null> {
  const [metabolites, studies] = await Promise.all([
    searchMetabolitesByName(moleculeName),
    searchStudiesByMetabolite(moleculeName)
  ])

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
    metabolites: allMetabolites.slice(0, 20),
    studies: studies.slice(0, 10)
  }
}