import type { SMPDBPathway } from '../types'
import { LIMITS } from '../api-limits'
import { stripHtml } from '../utils'

const REACTOME_URL = 'https://reactome.org/ContentService/search/query'
const REACTOME_DETAIL_URL = 'https://reactome.org/ContentService/data/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

async function searchReactome(query: string, limit: number): Promise<SMPDBPathway[]> {
  try {
    const url = `${REACTOME_URL}?query=${encodeURIComponent(query)}&types=Pathway&species=Homo+sapiens&cluster=true`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...fetchOptions,
    })
    if (!res.ok) return []

    const data = await res.json()
    const pathwayGroup = (data.results ?? []).find(
      (g: { typeName?: string }) => g.typeName === 'Pathway',
    )
    if (!pathwayGroup) return []

    const entries = (pathwayGroup.entries ?? []).slice(0, limit)
    return entries.map((entry: {
      stId?: string
      name?: string
      species?: string
      summation?: string
    }) => ({
      smpdbId: entry.stId || '',
      name: entry.name || '',
      description: stripHtml(entry.summation || ''),
      pathwayType: 'Metabolic',
      organism: entry.species || 'Homo sapiens',
      metabolites: [],
      enzymes: [],
      url: `https://reactome.org/content/detail/${entry.stId || ''}`,
    }))
  } catch (error) {
    console.error('SMPDB search error:', error)
    return []
  }
}

export async function searchSMPDB(query: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  return searchReactome(query, limit)
}

export async function getSMPDBPathway(smpdbId: string): Promise<SMPDBPathway | null> {
  try {
    const url = `${REACTOME_DETAIL_URL}/${encodeURIComponent(smpdbId)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...fetchOptions,
    })
    if (!res.ok) return null

    const data = await res.json()
    const pathway = Array.isArray(data) ? data[0] : data

    return {
      smpdbId: pathway.stId || smpdbId,
      name: pathway.name || '',
      description: stripHtml(pathway.summation || ''),
      pathwayType: pathway.compartment?.[0]?.name || 'Metabolic',
      organism: pathway.species?.displayName || 'Homo sapiens',
      metabolites: [],
      enzymes: (pathway.compartment ?? []).map((c: { name?: string }) => c.name || ''),
      url: `https://reactome.org/content/detail/${smpdbId}`,
    }
  } catch (error) {
    console.error('SMPDB pathway fetch error:', error)
    return null
  }
}

export async function searchSMPDBByMetabolite(metabolite: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  return searchReactome(metabolite, limit)
}