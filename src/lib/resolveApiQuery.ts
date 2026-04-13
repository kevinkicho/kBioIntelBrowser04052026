import type { ApiIdentifierType, ApiParamValue } from './apiIdentifiers'
import { API_IDENTIFIER_CONFIGS } from './apiIdentifiers'
import { getMoleculeById } from './api/pubchem'

const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PC_FETCH_OPTS: RequestInit = { next: { revalidate: 86400 } }

export interface MoleculeIdentifiers {
  cid: number
  name: string
  synonyms: string[]
  inchiKey: string
  iupacName: string
  formula: string
  molecularWeight: number
  smiles: string
  cas: string
  inchi: string
  geneSymbols: string[]
  uniprotAccessions: string[]
}

const _identifiersCache = new Map<number, MoleculeIdentifiers>()

export async function getMoleculeIdentifiers(cid: number): Promise<MoleculeIdentifiers | null> {
  if (_identifiersCache.has(cid)) return _identifiersCache.get(cid)!

  const molecule = await getMoleculeById(cid)
  if (!molecule) return null

  let smiles = ''
  let cas = ''
  let inchi = ''
  const geneSymbols: string[] = []
  const uniprotAccessions: string[] = []

  try {
    const [propsRes, synRes] = await Promise.all([
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/property/IsomericSMILES,InChI/JSON`, PC_FETCH_OPTS),
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`, PC_FETCH_OPTS),
    ])

    if (propsRes.ok) {
      const propsData = await propsRes.json()
      const p = propsData.PropertyTable?.Properties?.[0]
      if (p) {
        smiles = p.IsomericSMILES ?? ''
        inchi = p.InChI ?? ''
      }
    }

    if (synRes.ok) {
      const synData = await synRes.json()
      const allSyns: string[] = synData.InformationList?.Information?.[0]?.Synonym ?? []
      const casMatch = allSyns.find(s => /^\d{2,7}-\d{2,7}-\d$/.test(s))
      if (casMatch) cas = casMatch
    }
  } catch {}

  const identifiers: MoleculeIdentifiers = {
    cid,
    name: molecule.name,
    synonyms: molecule.synonyms || [],
    inchiKey: molecule.inchiKey,
    iupacName: molecule.iupacName,
    formula: molecule.formula,
    molecularWeight: molecule.molecularWeight,
    smiles,
    cas,
    inchi,
    geneSymbols,
    uniprotAccessions,
  }

  _identifiersCache.set(cid, identifiers)
  return identifiers
}

export function resolveApiQuery(
  identifiers: MoleculeIdentifiers,
  apiSource: string,
  overrides: Record<string, ApiIdentifierType>,
): string {
  const config = API_IDENTIFIER_CONFIGS.find(c => c.panelId === apiSource)
  const idType = overrides[apiSource] ?? config?.defaultType ?? 'name'

  switch (idType) {
    case 'cid':
      return String(identifiers.cid)
    case 'name':
      return identifiers.name
    case 'cas':
      return identifiers.cas || identifiers.name
    case 'smiles':
      return identifiers.smiles || identifiers.name
    case 'inchikey':
      return identifiers.inchiKey || identifiers.name
    case 'inchi':
      return identifiers.inchi || identifiers.name
    case 'formula':
      return identifiers.formula || identifiers.name
    case 'gene_symbol':
      return identifiers.geneSymbols[0] || identifiers.name
    case 'uniprot_accession':
      return identifiers.uniprotAccessions[0] || identifiers.name
    case 'pdb_id':
      return identifiers.name
    default:
      return identifiers.name
  }
}

export function getApiParam(
  apiParams: Record<string, ApiParamValue>,
  apiSource: string,
  paramKey: string,
  defaultValue: number | string | boolean,
): number | string | boolean {
  return apiParams[apiSource]?.[paramKey] ?? defaultValue
}

export function getApiParamNumber(
  apiParams: Record<string, ApiParamValue>,
  apiSource: string,
  paramKey: string,
  defaultValue: number,
): number {
  return Number(apiParams[apiSource]?.[paramKey] ?? defaultValue)
}