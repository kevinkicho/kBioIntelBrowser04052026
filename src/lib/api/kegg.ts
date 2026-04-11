import type { KEGGPathway, KEGGCompound, KEGGDrug } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'https://rest.kegg.jp'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

// Existing types kept for backward compatibility
export interface KeggReactionDetail {
  id: string
  name: string
  equation: string
  enzymes: string[]
}

/**
 * Get KEGG compound ID from name (existing function)
 */
export async function getKeggCompoundId(name: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/find/compound/${encodeURIComponent(name)}`, fetchOptions)
    if (!res.ok) return null
    const text = await res.text()
    const firstLine = text.trim().split('\n')[0]
    if (!firstLine) return null
    const match = firstLine.match(/cpd:(C\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Get KEGG reactions for a compound (existing function)
 */
export async function getKeggReactions(compoundId: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/link/reaction/${compoundId}`, fetchOptions)
    if (!res.ok) return []
    const text = await res.text()
    return text.trim().split('\n')
      .map(line => line.match(/rn:(R\d+)/)?.[1])
      .filter((id): id is string => id !== undefined)
      .slice(0, 10)
  } catch {
    return []
  }
}

/**
 * Get KEGG reaction details (existing function)
 */
export async function getKeggReactionDetail(reactionId: string): Promise<KeggReactionDetail | null> {
  try {
    const res = await fetch(`${BASE_URL}/get/${reactionId}`, fetchOptions)
    if (!res.ok) return null
    const text = await res.text()

    const name = text.match(/^NAME\s+(.+)/m)?.[1]?.trim() ?? reactionId
    const equation = text.match(/^EQUATION\s+(.+)/m)?.[1]?.trim() ?? ''
    const enzymeBlock = text.match(/^ENZYME\s+([\s\S]*?)(?=^\w|\Z)/m)?.[1] ?? ''
    const enzymes = enzymeBlock.trim().split(/\s+/).filter(Boolean).slice(0, 5)

    return { id: reactionId, name, equation, enzymes }
  } catch {
    return null
  }
}

/**
 * Search KEGG for pathway information (NEW)
 */
export async function searchKEGGPathways(query: string, limit: number = LIMITS.KEGG.initial): Promise<KEGGPathway[]> {
  try {
    const searchUrl = `${BASE_URL}/find/pathway/${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const text = await searchRes.text()
    const lines = text.trim().split('\n').filter(Boolean)

    const pathways: KEGGPathway[] = []
    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const line = lines[i]
      const match = line.match(/^path:(map\d+)\s+(.+)/)
      if (match) {
        const pathwayId = match[1]
        pathways.push({
          id: pathwayId,
          name: match[2],
          description: '',
          class: '',
          compounds: [],
          drugs: [],
          enzymes: [],
          genes: [],
          url: `https://www.kegg.jp/kegg-bin/show_pathway?${pathwayId}`,
          imageUrl: `https://www.kegg.jp/kegg-bin/show_pathway?${pathwayId}/default%3dpink`,
        })
      }
    }

    return pathways
  } catch (error) {
    console.error('KEGG pathway search error:', error)
    return []
  }
}

/**
 * Get detailed pathway information (NEW)
 */
export async function getKEGGPathway(pathwayId: string): Promise<KEGGPathway | null> {
  try {
    const infoUrl = `${BASE_URL}/get/${pathwayId}`
    const infoRes = await fetch(infoUrl, fetchOptions)
    if (!infoRes.ok) return null

    const text = await infoRes.text()

    const pathway: KEGGPathway = {
      id: pathwayId,
      name: '',
      description: '',
      class: '',
      compounds: [],
      drugs: [],
      enzymes: [],
      genes: [],
      url: `https://www.kegg.jp/kegg-bin/show_pathway?${pathwayId}`,
      imageUrl: `https://www.kegg.jp/kegg-bin/show_pathway?${pathwayId}/default%3dpink`,
    }

    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('NAME')) {
        pathway.name = line.replace('NAME', '').trim()
      } else if (line.startsWith('DESCRIPTION')) {
        pathway.description = line.replace('DESCRIPTION', '').trim()
      } else if (line.startsWith('CLASS')) {
        pathway.class = line.replace('CLASS', '').trim()
      }
    }

    return pathway
  } catch (error) {
    console.error('KEGG pathway fetch error:', error)
    return null
  }
}

/**
 * Search KEGG for compound information (NEW)
 */
export async function searchKEGGCompounds(query: string, limit: number = LIMITS.KEGG.initial): Promise<KEGGCompound[]> {
  try {
    const searchUrl = `${BASE_URL}/find/compound/${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const text = await searchRes.text()
    const lines = text.trim().split('\n').filter(Boolean)

    const compounds: KEGGCompound[] = []
    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const line = lines[i]
      const match = line.match(/^cpd:(C\d+)\s+(.+)/)
      if (match) {
        compounds.push({
          id: `cpd:${match[1]}`,
          name: match[2],
          formula: '',
          exactMass: 0,
          molWeight: 0,
          pathways: [],
          enzymes: [],
          reactions: [],
          dbLinks: [],
          url: `https://www.kegg.jp/entry/cpd:${match[1]}`,
        })
      }
    }

    return compounds
  } catch (error) {
    console.error('KEGG compound search error:', error)
    return []
  }
}

/**
 * Search KEGG for drug information (NEW)
 */
export async function searchKEGGDrugs(query: string, limit: number = LIMITS.KEGG.initial): Promise<KEGGDrug[]> {
  try {
    const searchUrl = `${BASE_URL}/find/drug/${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const text = await searchRes.text()
    const lines = text.trim().split('\n').filter(Boolean)

    const drugs: KEGGDrug[] = []
    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const line = lines[i]
      const match = line.match(/^dr:(D\d+)\s+(.+)/)
      if (match) {
        drugs.push({
          id: `dr:${match[1]}`,
          name: match[2],
          formula: '',
          exactMass: 0,
          molWeight: 0,
          pathways: [],
          targets: [],
          ATC: '',
          dbLinks: [],
          url: `https://www.kegg.jp/entry/dr:${match[1]}`,
        })
      }
    }

    return drugs
  } catch (error) {
    console.error('KEGG drug search error:', error)
    return []
  }
}

/**
 * Get compound details by ID (NEW)
 */
export async function getKEGGCompound(compoundId: string): Promise<KEGGCompound | null> {
  try {
    const cleanId = compoundId.replace('cpd:', '')
    const infoUrl = `${BASE_URL}/get/cpd:${cleanId}`
    const infoRes = await fetch(infoUrl, fetchOptions)
    if (!infoRes.ok) return null

    const text = await infoRes.text()

    const compound: KEGGCompound = {
      id: `cpd:${cleanId}`,
      name: '',
      formula: '',
      exactMass: 0,
      molWeight: 0,
      pathways: [],
      enzymes: [],
      reactions: [],
      dbLinks: [],
      url: `https://www.kegg.jp/entry/cpd:${cleanId}`,
    }

    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('NAME')) {
        compound.name = line.replace('NAME', '').trim().split(',')[0] ?? ''
      } else if (line.startsWith('FORMULA')) {
        compound.formula = line.replace('FORMULA', '').trim()
      } else if (line.startsWith('EXACT_MASS')) {
        compound.exactMass = parseFloat(line.replace('EXACT_MASS', '').trim()) || 0
      } else if (line.startsWith('MOL_WEIGHT')) {
        compound.molWeight = parseFloat(line.replace('MOL_WEIGHT', '').trim()) || 0
      } else if (line.startsWith('PATHWAY')) {
        const pathMatch = line.match(/path:(map\d+|hsa\d+)/)
        if (pathMatch) compound.pathways.push(pathMatch[1])
      } else if (line.startsWith('ENZYME')) {
        const enzymeMatch = line.match(/ec:(\d+\.\d+\.\d+\.\d+)/)
        if (enzymeMatch) compound.enzymes.push(enzymeMatch[1])
      } else if (line.startsWith('REACTION')) {
        const rxnMatch = line.match(/rn:(R\d+)/)
        if (rxnMatch) compound.reactions.push(rxnMatch[1])
      } else if (line.startsWith('DBLINKS')) {
        const dbMatch = line.match(/DBLINKS\s+(\w+):\s*(.+)/)
        if (dbMatch) {
          compound.dbLinks.push({
            database: dbMatch[1],
            ids: dbMatch[2].trim().split(/\s+/),
          })
        }
      }
    }

    return compound
  } catch (error) {
    console.error('KEGG compound fetch error:', error)
    return null
  }
}

/**
 * Get comprehensive KEGG data for a compound/drug query (NEW)
 */
export async function getKEGGData(query: string): Promise<{
  pathways: KEGGPathway[]
  compounds: KEGGCompound[]
  drugs: KEGGDrug[]
}> {
  try {
    const [pathways, compounds, drugs] = await Promise.all([
      searchKEGGPathways(query, 10),
      searchKEGGCompounds(query, 10),
      searchKEGGDrugs(query, 10),
    ])

    return { pathways, compounds, drugs }
  } catch (error) {
    console.error('KEGG data fetch error:', error)
    return { pathways: [], compounds: [], drugs: [] }
  }
}