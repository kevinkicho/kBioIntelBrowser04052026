import type { SAbDabEntry } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const BASE_URL = 'http://opig.stats.ox.ac.uk/webapps/abdb/sabdab-json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * SAbDab harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Short query, 404, missing id, and zero-hit JSON remain empty.
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

/**
 * Search SAbDab for antibody structure data
 * SAbDab is the Structural Antibody Database
 */
export async function searchSAbDab(query: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/search?query=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'SAbDab')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.structures || []
  return results.map((entry: Record<string, unknown>) => formatEntry(entry)).filter((e: SAbDabEntry) => e.pdbId)
}

/**
 * Get SAbDab entry by PDB ID
 */
export async function getSAbDabEntry(pdbId: string): Promise<SAbDabEntry | null> {
  const id = pdbId.trim()
  if (!id) return null
  const entryUrl = `${BASE_URL}/structure/${id}`
  const entryRes = await timedFetch(entryUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(entryRes.status)) return null
  throwIfHttpFailed(entryRes, 'SAbDab')
  const entry = await entryRes.json() as Record<string, unknown>
  return formatEntry({ ...entry, pdb: entry.pdb || entry.pdb_id || id, id: entry.id || id })
}

/**
 * Search SAbDab by antigen name
 */
export async function searchSAbDabByAntigen(antigen: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  const q = antigen.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/antigen/${encodeURIComponent(q)}?limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'SAbDab')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.structures || []
  return results.map(formatEntry)
}

/**
 * Search SAbDab by CDR sequence
 */
export async function searchSAbDabByCDR(cdrSequence: string, limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  const q = cdrSequence.trim()
  if (!q || q.length < 2) return []
  const searchUrl = `${BASE_URL}/cdr_search?sequence=${encodeURIComponent(q)}&limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'SAbDab')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.structures || []
  return results.map(formatEntry)
}

/**
 * Get SAbDab entries by antibody type
 */
export async function getSAbDabByType(type: 'Fab' | 'scFv' | 'VHH' | 'Nanobody' | 'Fab2' | 'IgG', limit: number = LIMITS.SABDAB.initial): Promise<SAbDabEntry[]> {
  const searchUrl = `${BASE_URL}/type/${type}?limit=${limit}`
  const searchRes = await timedFetch(searchUrl, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'SAbDab')
  const searchData = await searchRes.json()
  const results = searchData?.results || searchData?.structures || []
  return results.map(formatEntry)
}
