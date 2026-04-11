import type { SAbDabEntry } from '../types'
import { LIMITS } from '../api-limits'

const BASE_URL = 'http://opig.stats.ox.ac.uk/webapps/abdb/sabdab-json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

/**
 * Search SAbDab for antibody structure data
 * SAbDab is the Structural Antibody Database
 */
export async function searchSAbDab(query: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  try {
    const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.structures || []

    return results.map((entry: Record<string, unknown>) => ({
      id: String(entry.id || entry.pdb_id || ''),
      pdbId: String(entry.pdb || entry.pdb_id || entry.pdbId || ''),
      resolution: parseFloat(String(entry.resolution || entry.res || '0')),
      species: Array.isArray(entry.species) ? entry.species.map(String) : String(entry.species || '').split(',').map(s => s.trim()).filter(Boolean),
      heavyChain: String(entry.heavy_chain || entry.heavyChain || entry.vh || ''),
      lightChain: String(entry.light_chain || entry.lightChain || entry.vl || ''),
      antigen: String(entry.antigen || entry.antigen_name || ''),
      antigenType: String(entry.antigen_type || entry.antigenType || 'protein'),
      antibodyType: parseAntibodyType(entry.antibody_type || entry.antibodyType || entry.type),
      cdrSequences: {
        heavy: {
          cdr1: String(entry.hcdr1 || entry.heavy_cdr1 || ''),
          cdr2: String(entry.hcdr2 || entry.heavy_cdr2 || ''),
          cdr3: String(entry.hcdr3 || entry.heavy_cdr3 || ''),
        },
        light: {
          cdr1: String(entry.lcdr1 || entry.light_cdr1 || ''),
          cdr2: String(entry.lcdr2 || entry.light_cdr2 || ''),
          cdr3: String(entry.lcdr3 || entry.light_cdr3 || ''),
        },
      },
      affinity: entry.affinity || entry.kd ? parseFloat(String(entry.affinity || entry.kd)) : null,
      affinityUnits: String(entry.affinity_units || entry.units || 'nM'),
      url: `https://opig.stats.ox.ac.uk/webapps/abdb/${entry.pdb || entry.pdb_id || entry.id}`,
    })).filter((e: SAbDabEntry) => e.pdbId)
  } catch (error) {
    console.error('SAbDab search error:', error)
    return []
  }
}

/**
 * Get SAbDab entry by PDB ID
 */
export async function getSAbDabEntry(pdbId: string): Promise<SAbDabEntry | null> {
  try {
    const entryUrl = `${BASE_URL}/structure/${pdbId}`
    const entryRes = await fetch(entryUrl, fetchOptions)
    if (!entryRes.ok) return null

    const entry = await entryRes.json()

    return {
      id: String(entry.id || pdbId),
      pdbId: entry.pdb || entry.pdb_id || pdbId,
      resolution: parseFloat(String(entry.resolution || entry.res || '0')),
      species: Array.isArray(entry.species) ? entry.species.map(String) : String(entry.species || '').split(',').map(s => s.trim()).filter(Boolean),
      heavyChain: entry.heavy_chain || entry.heavyChain || entry.vh || '',
      lightChain: entry.light_chain || entry.lightChain || entry.vl || '',
      antigen: entry.antigen || entry.antigen_name || '',
      antigenType: entry.antigen_type || entry.antigenType || 'protein',
      antibodyType: parseAntibodyType(entry.antibody_type || entry.antibodyType || entry.type),
      cdrSequences: {
        heavy: {
          cdr1: entry.hcdr1 || entry.heavy_cdr1 || '',
          cdr2: entry.hcdr2 || entry.heavy_cdr2 || '',
          cdr3: entry.hcdr3 || entry.heavy_cdr3 || '',
        },
        light: {
          cdr1: entry.lcdr1 || entry.light_cdr1 || '',
          cdr2: entry.lcdr2 || entry.light_cdr2 || '',
          cdr3: entry.lcdr3 || entry.light_cdr3 || '',
        },
      },
      affinity: entry.affinity || entry.kd ? parseFloat(String(entry.affinity || entry.kd)) : null,
      affinityUnits: entry.affinity_units || entry.units || 'nM',
      url: `https://opig.stats.ox.ac.uk/webapps/abdb/${pdbId}`,
    }
  } catch (error) {
    console.error('SAbDab entry fetch error:', error)
    return null
  }
}

/**
 * Search SAbDab by antigen name
 */
export async function searchSAbDabByAntigen(antigen: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  try {
    const searchUrl = `${BASE_URL}/antigen/${encodeURIComponent(antigen)}?limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.structures || []

    return results.map(formatEntry)
  } catch (error) {
    console.error('SAbDab antigen search error:', error)
    return []
  }
}

/**
 * Search SAbDab by CDR sequence
 */
export async function searchSAbDabByCDR(cdrSequence: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  try {
    const searchUrl = `${BASE_URL}/cdr_search?sequence=${encodeURIComponent(cdrSequence)}&limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.structures || []

    return results.map(formatEntry)
  } catch (error) {
    console.error('SAbDab CDR search error:', error)
    return []
  }
}

/**
 * Get SAbDab entries by antibody type
 */
export async function getSAbDabByType(type: 'Fab' | 'scFv' | 'VHH' | 'Nanobody' | 'Fab2' | 'IgG', limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  try {
    const searchUrl = `${BASE_URL}/type/${type}?limit=${limit}`
    const searchRes = await fetch(searchUrl, fetchOptions)
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    const results = searchData?.results || searchData?.structures || []

    return results.map(formatEntry)
  } catch (error) {
    console.error('SAbDab type search error:', error)
    return []
  }
}

function parseAntibodyType(type: unknown): SAbDabEntry['antibodyType'] {
  const t = String(type).toLowerCase()
  if (t.includes('nanobody') || t.includes('vhh')) return 'Nanobody'
  if (t.includes('scfv') || t.includes('scfv')) return 'scFv'
  if (t.includes('fab2') || t.includes('fab2')) return 'Fab2'
  if (t.includes('igg') || t.includes('ig g')) return 'IgG'
  return 'Fab'
}

function formatEntry(entry: Record<string, unknown>): SAbDabEntry {
  return {
    id: String(entry.id || entry.pdb_id || ''),
    pdbId: String(entry.pdb || entry.pdb_id || entry.pdbId || ''),
    resolution: parseFloat(String(entry.resolution || entry.res || '0')),
    species: Array.isArray(entry.species) ? entry.species.map(String) : String(entry.species || '').split(',').map(s => s.trim()).filter(Boolean),
    heavyChain: String(entry.heavy_chain || entry.heavyChain || entry.vh || ''),
    lightChain: String(entry.light_chain || entry.lightChain || entry.vl || ''),
    antigen: String(entry.antigen || entry.antigen_name || ''),
    antigenType: String(entry.antigen_type || entry.antigenType || 'protein'),
    antibodyType: parseAntibodyType(entry.antibody_type || entry.antibodyType || entry.type),
    cdrSequences: {
      heavy: {
        cdr1: String(entry.hcdr1 || entry.heavy_cdr1 || ''),
        cdr2: String(entry.hcdr2 || entry.heavy_cdr2 || ''),
        cdr3: String(entry.hcdr3 || entry.heavy_cdr3 || ''),
      },
      light: {
        cdr1: String(entry.lcdr1 || entry.light_cdr1 || ''),
        cdr2: String(entry.lcdr2 || entry.light_cdr2 || ''),
        cdr3: String(entry.lcdr3 || entry.light_cdr3 || ''),
      },
    },
    affinity: entry.affinity || entry.kd ? parseFloat(String(entry.affinity || entry.kd)) : null,
    affinityUnits: String(entry.affinity_units || entry.units || 'nM'),
    url: `https://opig.stats.ox.ac.uk/webapps/abdb/${entry.pdb || entry.pdb_id || entry.id}`,
  }
}