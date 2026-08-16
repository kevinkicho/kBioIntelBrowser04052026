import type { GeneInfo } from '../types'
import { LIMITS } from '../api-limits'
import { getApiKey } from './utils'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * NCBI Gene harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Empty query, 404, and zero-hit JSON (empty idlist) remain empty.
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

export async function getGeneInfoByName(name: string): Promise<GeneInfo[]> {
  const q = name?.trim()
  if (!q) return []

  const NCBI_EMAIL = process.env.NCBI_EMAIL ?? ''
  const NCBI_API_KEY = getApiKey('NCBI_API_KEY') ?? ''
  const credsSuffix = (NCBI_API_KEY ? `&api_key=${NCBI_API_KEY}` : '') + (NCBI_EMAIL ? `&email=${encodeURIComponent(NCBI_EMAIL)}` : '')
  const term = `${encodeURIComponent(q)}+AND+Homo+sapiens[Organism]`
  const searchRes = await timedFetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${term}&retmode=json&retmax=${LIMITS.NCBI_GENE.initial}${credsSuffix}`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'NCBI Gene')
  const searchData = await searchRes.json()
  const ids: string[] = searchData?.esearchresult?.idlist ?? []
  if (ids.length === 0) return []

  const summaryRes = await timedFetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${ids.join(',')}&retmode=json${credsSuffix}`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(summaryRes.status)) return []
  throwIfHttpFailed(summaryRes, 'NCBI Gene')
  const summaryData = await summaryRes.json()
  const resultObj = summaryData?.result ?? {}

  return ids
    .map((id): GeneInfo | null => {
      const entry = resultObj[id]
      if (!entry) return null
      return {
        geneId: id,
        symbol: entry.Name ?? entry.name ?? '',
        name: entry.Description ?? entry.description ?? '',
        summary: entry.Summary ?? entry.summary ?? '',
        chromosome: entry.Chromosome ?? entry.chromosome ?? '',
        mapLocation: entry.MapLocation ?? entry.maplocation ?? '',
        organism: entry.Organism?.ScientificName ?? entry.organism?.scientificname ?? entry.organism?.ScientificName ?? '',
        url: `https://www.ncbi.nlm.nih.gov/gene/${id}`,
      }
    })
    .filter((g): g is GeneInfo => g !== null)
}
