import type { Molecule, SearchResult } from '../types'
import { classifyMolecule, buildStructureImageUrl } from '../utils'
import type { SearchType } from '../apiIdentifiers'

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const AUTOCOMPLETE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound'

const fetchOptions: RequestInit = {
  next: { revalidate: 3600 }, // Cache for 1 hour (Next.js fetch cache)
}

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

export async function getMoleculeById(cid: number): Promise<Molecule | null> {
  try {
    const [propsRes, synonymsRes, descRes] = await Promise.all([
      fetch(
        `${BASE_URL}/compound/cid/${cid}/property/MolecularFormula,IUPACName,MolecularWeight,Title,InChIKey/JSON`,
        fetchOptions
      ),
      fetch(`${BASE_URL}/compound/cid/${cid}/synonyms/JSON`, fetchOptions),
      fetch(`${BASE_URL}/compound/cid/${cid}/description/JSON`, fetchOptions),
    ])

    if (!propsRes.ok) return null

    const propsData = await propsRes.json()
    const props = propsData.PropertyTable?.Properties?.[0]
    if (!props) return null

    const synonymsData = synonymsRes.ok ? await synonymsRes.json() : {}
    const synonyms: string[] = synonymsData.InformationList?.Information?.[0]?.Synonym?.slice(0, 10) ?? []

    const descData = descRes.ok ? await descRes.json() : {}
    let description: string = descData.InformationList?.Information?.[0]?.Description?.[0] ?? ''

    const formula = props.MolecularFormula ?? ''
    const name = props.Title ?? `CID ${cid}`
    
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
      iupacName: props.IUPACName ?? '',
      molecularWeight: parseFloat(props.MolecularWeight) || 0,
      classification: classifyMolecule(name, synonyms),
      synonyms,
      description,
      structureImageUrl: buildStructureImageUrl(cid),
      inchiKey: props.InChIKey,
    }
  } catch {
    return null
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
  const molecule = await getMoleculeById(cid)
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
