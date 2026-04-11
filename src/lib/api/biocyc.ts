import type { BioCycPathway } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://websvc.biocyc.org/REST'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search BioCyc for metabolic pathways related to a compound
 */
export async function searchBioCyc(query: string, limit: number = LIMITS.BIOCYC.initial): Promise<BioCycPathway[]> {
  try {
    // BioCyc REST API for pathway search
    const searchUrl = `${BASE_URL}/xmlquery?[query:${encodeURIComponent(query)}]`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const text = await searchRes.text()

    // Parse XML response
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
  } catch (error) {
    console.error('BioCyc search error:', error)
    return []
  }
}

/**
 * Get pathway details by BioCyc ID
 */
export async function getBioCycPathway(pathwayId: string): Promise<BioCycPathway | null> {
  try {
    const pathwayUrl = `${BASE_URL}/xml-query?type=pathway&id=${pathwayId}&detail=full`
    const pathwayRes = await fetch(pathwayUrl, fetchOptions)
    if (!pathwayRes.ok) return null

    const text = await pathwayRes.text()

    // Extract pathway details from XML
    const nameMatch = text.match(/<Name>([^<]+)<\/Name>/)
    const descriptionMatch = text.match(/<Comment>([^<]+)<\/Comment>/)
    const organismMatch = text.match(/<Organism[^>]*frameid="([^"]+)"/)

    return {
      pathwayId,
      name: nameMatch?.[1] || pathwayId,
      description: descriptionMatch?.[1] || '',
      organism: organismMatch?.[1] || '',
      url: `https://biocyc.org/META/NEW-IMAGE?type=PATHWAY&object=${pathwayId}`,
    }
  } catch (error) {
    console.error('BioCyc pathway fetch error:', error)
    return null
  }
}

/**
 * Search for compounds in pathways by name
 */
export async function searchCompoundsInPathways(compound: string, limit: number = LIMITS.BIOCYC.initial): Promise<BioCycPathway[]> {
  try {
    const searchUrl = `${BASE_URL}/xmlquery?[find-compound:${encodeURIComponent(compound)}]`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

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
  } catch (error) {
    console.error('BioCyc compound search error:', error)
    return []
  }
}