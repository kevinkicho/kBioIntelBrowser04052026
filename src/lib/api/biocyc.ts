import type { BioCycPathway } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://websvc.biocyc.org/REST'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * BioCyc harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, missing id, and zero-hit XML remain empty.
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

function parsePathways(text: string, limit: number): BioCycPathway[] {
  const pathways: BioCycPathway[] = []
  const pathwayMatches = Array.from(text.matchAll(/<Pathway[^>]*frameid="([^"]+)"[^>]*>/g))
  const nameMatches = Array.from(text.matchAll(/<Pathway[^>]*>\s*<Name>([^<]+)<\/Name>/g))
  const pathwayIds = pathwayMatches.map(m => m[1]).slice(0, limit)
  const names = nameMatches.map(m => m[1])
  for (let i = 0; i < pathwayIds.length; i++) {
    pathways.push({
      pathwayId: pathwayIds[i],
      name: names[i] || pathwayIds[i],
      description: '',
      organism: '',
      url: `https://biocyc.org/META/NEW-IMAGE?type=PATHWAY&object=${pathwayIds[i]}`,
    })
  }
  return pathways
}

/**
 * Search BioCyc for metabolic pathways related to a compound
 */
export async function searchBioCyc(query: string, limit: number = LIMITS.BIOCYC.initial): Promise<BioCycPathway[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/xmlquery?[query:${encodeURIComponent(q)}]`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'BioCyc')
  const text = await searchRes.text()
  return parsePathways(text, limit)
}

/**
 * Get pathway details by BioCyc ID
 */
export async function getBioCycPathway(pathwayId: string): Promise<BioCycPathway | null> {
  const id = pathwayId.trim()
  if (!id) return null
  const pathwayUrl = `${BASE_URL}/xml-query?type=pathway&id=${id}&detail=full`
  const pathwayRes = await timedFetch(pathwayUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(pathwayRes.status)) return null
  throwIfHttpFailed(pathwayRes, 'BioCyc')
  const text = await pathwayRes.text()
  const nameMatch = text.match(/<Name>([^<]+)<\/Name>/)
  const descriptionMatch = text.match(/<Comment>([^<]+)<\/Comment>/)
  const organismMatch = text.match(/<Organism[^>]*frameid="([^"]+)"/)
  return {
    pathwayId: id,
    name: nameMatch?.[1] || id,
    description: descriptionMatch?.[1] || '',
    organism: organismMatch?.[1] || '',
    url: `https://biocyc.org/META/NEW-IMAGE?type=PATHWAY&object=${id}`,
  }
}

/**
 * Search for compounds in pathways by name
 */
export async function searchCompoundsInPathways(compound: string, limit: number = LIMITS.BIOCYC.initial): Promise<BioCycPathway[]> {
  const q = compound.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/xmlquery?[find-compound:${encodeURIComponent(q)}]`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'BioCyc')
  const text = await searchRes.text()
  const pathways: BioCycPathway[] = []
  const compoundMatches = Array.from(text.matchAll(/<Compound[^>]*frameid="([^"]+)"[^>]*>/g))
  for (const match of compoundMatches.slice(0, limit)) {
    const compoundId = match[1]
    pathways.push({
      pathwayId: compoundId,
      name: compoundId,
      description: '',
      organism: '',
      url: `https://biocyc.org/META/NEW-IMAGE?type=COMPOUND&object=${compoundId}`,
    })
  }
  return pathways
}
