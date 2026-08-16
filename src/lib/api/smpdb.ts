import type { SMPDBPathway } from '../types'
import { LIMITS } from '../api-limits'
import { stripHtml } from '../utils'
import { timedFetch } from './timedFetch'

const REACTOME_URL = 'https://reactome.org/ContentService/search/query'
const REACTOME_DETAIL_URL = 'https://reactome.org/ContentService/data/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * SMPDB harvest leaf (Reactome ContentService). HTTP / HTML / timeout are not EMPTY.
 * True 404, missing id, and zero-hit JSON remain empty.
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

async function searchReactome(query: string, limit: number): Promise<SMPDBPathway[]> {
  const url = `${REACTOME_URL}?query=${encodeURIComponent(query)}&types=Pathway&species=Homo+sapiens&cluster=true`
  const res = await timedFetch(url, {
    headers: { Accept: 'application/json' },
    ...fetchOptions,
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'SMPDB')

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
}

export async function searchSMPDB(query: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  return searchReactome(query, limit)
}

export async function getSMPDBPathway(smpdbId: string): Promise<SMPDBPathway | null> {
  const url = `${REACTOME_DETAIL_URL}/${encodeURIComponent(smpdbId)}`
  const res = await timedFetch(url, {
    headers: { Accept: 'application/json' },
    ...fetchOptions,
    timeoutMs: 8000,
  })
  if (isAbsentStatus(res.status)) return null
  throwIfHttpFailed(res, 'SMPDB')

  const data = await res.json()
  const pathway = Array.isArray(data) ? data[0] : data
  if (!pathway) return null

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
}

export async function searchSMPDBByMetabolite(metabolite: string, limit: number = LIMITS.SMPDB.initial): Promise<SMPDBPathway[]> {
  return searchReactome(metabolite, limit)
}
