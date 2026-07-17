import type { Molecule, SearchResult } from '../types'
import { classifyMolecule, buildStructureImageUrl } from '../utils'
import type { SearchType } from '../apiIdentifiers'
import { getCached, setCache } from '../cache'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const AUTOCOMPLETE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound'

const fetchOptions: RequestInit = {
  next: { revalidate: 3600 }, // Cache for 1 hour (Next.js fetch cache)
}

/** Process-local success/not-found cache — avoids N parallel category routes re-hitting PubChem. */
const MOLECULE_CACHE_TTL_MS = 3600_000
/** In-flight de-dupe so concurrent pipeline+category loads share one lookup. */
const moleculeInflight = new Map<number, Promise<Molecule | null>>()

// Threshold for large molecules (peptides/proteins)
const LARGE_MOLECULE_ATOM_THRESHOLD = 100

/**
 * Check if a molecule is "large" (peptide/protein) based on formula
 */
function isLargeMolecule(formula: string): boolean {
  if (!formula) return false
  // Count approximate number of atoms from formula
  // Example: C256H381N65O77S6 has ~776 atoms
  const atomCounts = formula.match(/\d+/g)
  if (!atomCounts) return false
  const totalAtoms = atomCounts.reduce((sum, count) => sum + parseInt(count), 0)
  return totalAtoms > LARGE_MOLECULE_ATOM_THRESHOLD
}

/**
 * Get a simplified description for large molecules
 */
function getLargeMoleculeDescription(name: string, formula: string): string {
  return `${name} is a large biological molecule (peptide/protein) with formula ${formula}. ` +
    `This molecule has complex structural data that may not be fully displayed. ` +
    `Consider using protein-specific databases like UniProt or PDB for detailed structural information.`
}

export async function searchMolecules(query: string): Promise<string[]> {
  try {
    const url = `${AUTOCOMPLETE_URL}/${encodeURIComponent(query)}/JSON?limit=8`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return data.dictionary_terms?.compound ?? []
  } catch {
    return []
  }
}

export async function searchMoleculesByName(query: string): Promise<SearchResult[]> {
  try {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(query)}/property/MolecularFormula/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const props = data.PropertyTable?.Properties ?? []
    return props.slice(0, 5).map((p: { CID: number; MolecularFormula: string }) => ({
      cid: p.CID,
      name: query,
      formula: p.MolecularFormula,
    }))
  } catch {
    return []
  }
}

/**
 * Transient PubChem / network failure. Callers should map this to 502/503,
 * not 404 — a missing molecule is only when getMoleculeById returns null.
 */
export class PubChemUpstreamError extends Error {
  readonly status?: number
  readonly retryable = true

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PubChemUpstreamError'
    this.status = status
  }
}

function isNotFoundStatus(status: number): boolean {
  // 404 = absent; 400 often means bad/unknown CID shape from PubChem
  return status === 404 || status === 400
}

/**
 * Resolve a PubChem CID to a Molecule.
 * - Returns null only when PubChem indicates the CID does not exist.
 * - Throws PubChemUpstreamError on rate limits, 5xx, or network failures
 *   so API routes do not mislabel flaky upstream as "Molecule not found".
 * - De-dupes concurrent lookups and caches successes process-locally so a
 *   profile page (pipeline + N categories) does not stampede PubChem.
 */
export async function getMoleculeById(cid: number): Promise<Molecule | null> {
  const cacheKey = `pubchem:molecule:${cid}`
  const cached = getCached<{ molecule: Molecule | null }>(cacheKey)
  if (cached) return cached.molecule

  const inflight = moleculeInflight.get(cid)
  if (inflight) return inflight

  const promise = fetchMoleculeByIdUncached(cid)
    .then((molecule) => {
      // Cache hits and true not-found; do not cache throws (retryable upstream).
      setCache(cacheKey, { molecule }, MOLECULE_CACHE_TTL_MS)
      return molecule
    })
    .finally(() => {
      moleculeInflight.delete(cid)
    })

  moleculeInflight.set(cid, promise)
  return promise
}

async function fetchMoleculeByIdUncached(cid: number): Promise<Molecule | null> {
  let propsRes: Response
  let synonymsRes: Response
  let descRes: Response
  try {
    ;[propsRes, synonymsRes, descRes] = await Promise.all([
      fetch(
        `${BASE_URL}/compound/cid/${cid}/property/MolecularFormula,IUPACName,MolecularWeight,Title,InChIKey/JSON`,
        fetchOptions
      ),
      fetch(`${BASE_URL}/compound/cid/${cid}/synonyms/JSON`, fetchOptions),
      fetch(`${BASE_URL}/compound/cid/${cid}/description/JSON`, fetchOptions),
    ])
  } catch (err) {
    throw new PubChemUpstreamError(
      err instanceof Error ? err.message : 'PubChem network error',
    )
  }

  if (!propsRes.ok) {
    if (isNotFoundStatus(propsRes.status)) return null
    throw new PubChemUpstreamError(
      `PubChem property lookup failed (${propsRes.status})`,
      propsRes.status,
    )
  }

  let propsData: { PropertyTable?: { Properties?: Array<Record<string, unknown>> } }
  try {
    propsData = await propsRes.json()
  } catch (err) {
    throw new PubChemUpstreamError(
      err instanceof Error ? err.message : 'PubChem response parse error',
      propsRes.status,
    )
  }

  const props = propsData.PropertyTable?.Properties?.[0]
  if (!props) return null

  const synonymsData = synonymsRes.ok ? await synonymsRes.json().catch(() => ({})) : {}
  const synonyms: string[] =
    synonymsData.InformationList?.Information?.[0]?.Synonym?.slice(0, 10) ?? []

  const descData = descRes.ok ? await descRes.json().catch(() => ({})) : {}
  let description: string =
    descData.InformationList?.Information?.[0]?.Description?.[0] ?? ''

  const formula = (props.MolecularFormula as string) ?? ''
  const name = (props.Title as string) ?? `CID ${cid}`

  // Check if this is a large molecule and add appropriate messaging
  if (isLargeMolecule(formula) && !description) {
    description = getLargeMoleculeDescription(name, formula)
  }

  // For large molecules, limit the formula display
  const displayFormula = isLargeMolecule(formula)
    ? `${formula.slice(0, 50)}... (large molecule)`
    : formula

  return {
    cid,
    name,
    formula: displayFormula,
    iupacName: (props.IUPACName as string) ?? '',
    molecularWeight: parseFloat(String(props.MolecularWeight)) || 0,
    classification: classifyMolecule(name, synonyms),
    synonyms,
    description,
    structureImageUrl: buildStructureImageUrl(cid),
    inchiKey: (props.InChIKey as string) ?? '',
  }
}

export async function getMoleculeCidByName(name: string): Promise<number | null> {
  try {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(name)}/cids/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    return data.IdentifierList?.CID?.[0] ?? null
  } catch {
    return null
  }
}

export interface MoleculeCandidate {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  inchiKey: string
  iupacName: string
}

/**
 * Resolve a name to multiple PubChem candidates for disambiguation UI.
 * Returns up to `limit` candidates with formula/MW/InChIKey for salt/parent splits.
 */
export async function getMoleculeCandidatesByName(
  name: string,
  limit: number = 8,
): Promise<MoleculeCandidate[]> {
  try {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(name)}/cids/JSON`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    const cids: number[] = (data.IdentifierList?.CID ?? []).slice(0, limit)
    if (!cids.length) return []

    const propUrl = `${BASE_URL}/compound/cid/${cids.join(',')}/property/Title,MolecularFormula,MolecularWeight,InChIKey,IUPACName/JSON`
    const propRes = await fetch(propUrl, fetchOptions)
    if (!propRes.ok) {
      return cids.map((cid) => ({
        cid,
        name,
        formula: '',
        molecularWeight: 0,
        inchiKey: '',
        iupacName: '',
      }))
    }
    const propData = await propRes.json()
    const props = propData.PropertyTable?.Properties ?? []
    return props.map((p: Record<string, unknown>) => ({
      cid: Number(p.CID),
      name: String(p.Title || name),
      formula: String(p.MolecularFormula || ''),
      molecularWeight: parseFloat(String(p.MolecularWeight || '0')) || 0,
      inchiKey: String(p.InChIKey || ''),
      iupacName: String(p.IUPACName || ''),
    }))
  } catch {
    return []
  }
}

/**
 * Get molecule with additional checks for large molecules
 */
export async function resolveIdentifier(query: string, type: SearchType): Promise<number | null> {
  try {
    let url: string
    switch (type) {
      case 'cid':
        return parseInt(query, 10) || null
      case 'cas':
        url = `${BASE_URL}/compound/name/${encodeURIComponent(query)}/cids/JSON`
        break
      case 'smiles':
        url = `${BASE_URL}/compound/smiles/${encodeURIComponent(query)}/cids/JSON`
        break
      case 'inchikey':
        url = `${BASE_URL}/compound/inchikey/${encodeURIComponent(query)}/cids/JSON`
        break
      case 'inchi':
        url = `${BASE_URL}/compound/inchi/${encodeURIComponent(query)}/cids/JSON`
        break
      case 'formula':
        url = `${BASE_URL}/compound/formula/${encodeURIComponent(query)}/cids/JSON?MaxRecords=1`
        break
      case 'name':
      default:
        url = `${BASE_URL}/compound/name/${encodeURIComponent(query)}/cids/JSON`
        break
    }
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const cidList = data.IdentifierList?.CID ?? data.PC_URIs?.[0]?.CID
    if (Array.isArray(cidList)) return cidList[0] ?? null
    if (typeof cidList === 'number') return cidList
    return null
  } catch {
    return null
  }
}

export async function searchByType(query: string, type: SearchType): Promise<string[]> {
  try {
    if (type === 'name') {
      return searchMolecules(query)
    }
    const cid = await resolveIdentifier(query, type)
    if (!cid) return []
    return [`CID ${cid}`]
  } catch {
    return []
  }
}

export async function getMoleculeByIdSafe(cid: number): Promise<Molecule | { error: string; cid: number }> {
  let molecule: Molecule | null
  try {
    molecule = await getMoleculeById(cid)
  } catch (err) {
    return {
      error: err instanceof PubChemUpstreamError
        ? err.message
        : 'Failed to fetch molecule',
      cid,
    }
  }
  if (!molecule) {
    return { error: 'Molecule not found', cid }
  }
  
  // Check if this is a large molecule
  if (isLargeMolecule(molecule.formula)) {
    return {
      ...molecule,
      _isLargeMolecule: true,
      _note: 'This is a large biological molecule (peptide/protein). Some visualizations may be limited.'
    } as Molecule & { _isLargeMolecule: boolean; _note: string }
  }
  
  return molecule
}
