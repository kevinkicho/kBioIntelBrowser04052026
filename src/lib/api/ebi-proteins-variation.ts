// EMBL-EBI Proteins API - Variation Data Client
// https://www.ebi.ac.uk/proteins/api/doc/
// Provides genetic variation data from 1000 Genomes, gnomAD, ClinVar, COSMIC
// Plus proteomics mappings and cross-references

const BASE_URL = 'https://www.ebi.ac.uk/proteins/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface ProteinVariation {
  accession: string
  entryName: string
  geneName: string
  variations: Variation[]
}

export interface Variation {
  type: string
  location: {
    start: number
    end: number
  }
  sequenceVariation?: {
    type: string
    sequence: string
  }
  clinicalSignificance?: string
  source: string
  sourceId: string
  frequency?: {
    value: number
    population?: string
  }
  description?: string
}

export interface ProteomicsMapping {
  accession: string
  entryName: string
  proteomicsData: ProteomicsEntry[]
}

export interface ProteomicsEntry {
  proteinId: string
  peptideCount: number
  uniquePeptideCount: number
  coverage: number
  experiments: string[]
}

export interface CrossReference {
  accession: string
  entryName: string
  crossReferences: {
    database: string
    id: string
    url?: string
  }[]
}

/**
 * Get genetic variations for a protein by UniProt accession
 */
export async function getProteinVariations(accession: string): Promise<ProteinVariation | null> {
  try {
    const url = `${BASE_URL}/variations?accession=${encodeURIComponent(accession)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    if (!data || data.length === 0) return null

    const item = data[0]
    return {
      accession: item.accession ?? '',
      entryName: item.entryName ?? '',
      geneName: item.geneName?.[0]?.value ?? '',
      variations: (item.variations ?? []).map((v: Record<string, unknown>) => {
        const location = v.featureLocation as Record<string, unknown> | undefined
        const seqVar = v.sequenceVariation as Record<string, unknown> | undefined
        const freq = v.frequency as Record<string, unknown> | undefined
        const locationStart = location?.start as Record<string, unknown> | undefined
        const locationEnd = location?.end as Record<string, unknown> | undefined
        return {
          type: (v.type as string) ?? '',
          location: {
            start: (locationStart?.position as number) ?? 0,
            end: (locationEnd?.position as number) ?? 0,
          },
          sequenceVariation: seqVar ? {
            type: (seqVar.type as string) ?? '',
            sequence: (seqVar.sequence as string) ?? '',
          } : undefined,
          clinicalSignificance: (v.clinicalSignificance as string) ?? undefined,
          source: (v.source as string) ?? '',
          sourceId: (v.sourceId as string) ?? '',
          frequency: freq ? {
            value: (freq.value as number) ?? 0,
            population: (freq.population as string) ?? undefined,
          } : undefined,
          description: (v.description as string) ?? undefined,
        }
      }),
    }
  } catch {
    return null
  }
}

/**
 * Get proteomics mappings for a protein
 */
export async function getProteomicsMappings(accession: string): Promise<ProteomicsMapping | null> {
  try {
    const url = `${BASE_URL}/proteomics?accession=${encodeURIComponent(accession)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    if (!data || data.length === 0) return null

    const item = data[0]
    return {
      accession: item.accession ?? '',
      entryName: item.entryName ?? '',
      proteomicsData: (item.proteomics ?? []).map((p: Record<string, unknown>) => ({
        proteinId: (p.proteinId as string) ?? '',
        peptideCount: (p.peptideCount as number) ?? 0,
        uniquePeptideCount: (p.uniquePeptideCount as number) ?? 0,
        coverage: (p.coverage as number) ?? 0,
        experiments: ((p.experiments as string[]) ?? []).map(e => e),
      })),
    }
  } catch {
    return null
  }
}

/**
 * Get cross-references for a protein
 */
export async function getProteinCrossReferences(accession: string): Promise<CrossReference | null> {
  try {
    const url = `${BASE_URL}/crossreferences?accession=${encodeURIComponent(accession)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    if (!data || data.length === 0) return null

    const item = data[0]
    return {
      accession: item.accession ?? '',
      entryName: item.entryName ?? '',
      crossReferences: (item.crossReferences ?? []).map((xr: Record<string, unknown>) => {
        const db = xr.database as Record<string, unknown> | undefined
        return {
          database: (db?.name as string) ?? '',
          id: (xr.id as string) ?? '',
          url: (xr.url as string) ?? undefined,
        }
      }),
    }
  } catch {
    return null
  }
}

/**
 * Search proteins by gene name
 */
export async function searchProteinsByGene(geneName: string, limit = 20): Promise<{ accession: string; entryName: string; geneName: string }[]> {
  try {
    const url = `${BASE_URL}/proteins?gene=${encodeURIComponent(geneName)}&size=${limit}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data ?? []).map((item: Record<string, unknown>) => ({
      accession: (item.accession as string) ?? '',
      entryName: (item.entryName as string) ?? '',
      geneName: (item.geneName as string) ?? '',
    }))
  } catch {
    return []
  }
}
