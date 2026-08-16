import type { GSRSSubstance } from '../types'
import { timedFetch } from './timedFetch'

const BASE_URL = 'https://gsrs.ncats.nih.gov/gsrs/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } } // 24 hours

interface GSRSName {
  name: string
  type: string
}

/**
 * GSRS harvest leaf. HTTP / HTML / timeout are not EMPTY.
 * True zero-hit JSON remains [].
 */
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

function parseStructure(structure?: Record<string, unknown>): {
  smiles?: string
  inchi?: string
  inchiKey?: string
  formula?: string
  molecularWeight?: number
} {
  if (!structure) return {}

  return {
    smiles: String(structure.smiles || ''),
    inchi: String(structure.inchi || ''),
    inchiKey: String(structure.inchiKey || ''),
    formula: String(structure.molecularFormula || structure.formula || ''),
    molecularWeight: parseFloat(String(structure.molecularWeight || structure.molecular_mass || '0')) || undefined,
  }
}

function mapSubstance(substance: Record<string, unknown>): GSRSSubstance {
  const names = (substance.names as GSRSName[] | undefined) || []
  const primaryName = names.find(n => n.type === 'COMMON_NAME' || n.type === 'USAN') || names[0]

  return {
    unii: String(substance.uuid || substance.unii || ''),
    name: String(primaryName?.name || substance.name || ''),
    synonyms: names.map(n => String(n.name || '')).filter(Boolean),
    type: String(substance.type || 'CHEMICAL'),
    structure: parseStructure(substance.structure as Record<string, unknown> | undefined),
    url: `https://gsrs.ncats.nih.gov/gsrs/substances/${substance.uuid || substance.unii || ''}`,
  }
}

/**
 * Search GSRS (Global Substance Registration System)
 * GSRS is the FDA's substance registration system for UNII identifiers
 */
export async function searchGSRS(query: string, limit: number = 20): Promise<GSRSSubstance[]> {
  const url = `${BASE_URL}/substances/search?q=${encodeURIComponent(query)}&size=${limit}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'GSRS')

  const data = await res.json()
  const substances = data.content || data.substances || []

  return substances.map((substance: Record<string, unknown>) => mapSubstance(substance)).filter((s: GSRSSubstance) => s.unii || s.name)
}

/**
 * Get GSRS substance by UNII
 */
export async function getGSRSByUNII(unii: string): Promise<GSRSSubstance | null> {
  const url = `${BASE_URL}/substances/${encodeURIComponent(unii)}`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  throwIfHttpFailed(res, 'GSRS')

  const substance = await res.json()
  return mapSubstance(substance)
}