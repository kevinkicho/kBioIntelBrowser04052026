import type { ApiIdentifierType, ApiParamValue } from './apiIdentifiers'
import { API_IDENTIFIER_CONFIGS } from './apiIdentifiers'
import { getMoleculeById } from './api/pubchem'
import { getUniChemMappings } from './api/unichem'

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
  /** External IDs from UniChem / crosswalks */
  chemblId?: string
  chebiId?: string
  drugbankId?: string
}

const _identifiersCache = new Map<number, MoleculeIdentifiers>()

/** Known UniChem source names → our fields (best-effort; UniChem names vary). */
function applyUniChemMappings(
  mappings: Array<{ sourceId: string; sourceName: string; externalId: string }>,
  ids: MoleculeIdentifiers,
): void {
  for (const m of mappings) {
    const name = (m.sourceName || '').toLowerCase()
    const ext = m.externalId
    if (!ext) continue
    if ((name.includes('chembl') || m.sourceId === '1') && !ids.chemblId) {
      ids.chemblId = ext.startsWith('CHEMBL') ? ext : `CHEMBL${ext}`
    } else if ((name.includes('chebi') || m.sourceId === '7') && !ids.chebiId) {
      ids.chebiId = ext
    } else if ((name.includes('drugbank') || m.sourceId === '2') && !ids.drugbankId) {
      ids.drugbankId = ext
    }
  }
}

/**
 * Always resolve full structure + synonym + UniChem crosswalk for a CID.
 * Used on every category fan-out so APIs can query by stable identifiers.
 */
export async function getMoleculeIdentifiers(cid: number): Promise<MoleculeIdentifiers | null> {
  if (_identifiersCache.has(cid)) return _identifiersCache.get(cid)!

  const molecule = await getMoleculeById(cid)
  if (!molecule) return null

  let smiles = ''
  let cas = ''
  let inchi = ''
  let inchiKey = molecule.inchiKey || ''
  const geneSymbols: string[] = []
  const uniprotAccessions: string[] = []

  try {
    const [propsRes, synRes] = await Promise.all([
      fetch(
        `${PUBCHEM_PUG}/compound/cid/${cid}/property/IsomericSMILES,InChI,InChIKey/JSON`,
        PC_FETCH_OPTS,
      ),
      fetch(`${PUBCHEM_PUG}/compound/cid/${cid}/synonyms/JSON`, PC_FETCH_OPTS),
    ])

    if (propsRes.ok) {
      const propsData = await propsRes.json()
      const p = propsData.PropertyTable?.Properties?.[0]
      if (p) {
        smiles = p.IsomericSMILES ?? ''
        inchi = p.InChI ?? ''
        if (p.InChIKey) inchiKey = p.InChIKey
      }
    }

    if (synRes.ok) {
      const synData = await synRes.json()
      const allSyns: string[] = synData.InformationList?.Information?.[0]?.Synonym ?? []
      const casMatch = allSyns.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s))
      if (casMatch) cas = casMatch
    }
  } catch {
    // keep partial identifiers
  }

  const identifiers: MoleculeIdentifiers = {
    cid,
    name: molecule.name,
    synonyms: molecule.synonyms || [],
    inchiKey,
    iupacName: molecule.iupacName,
    formula: molecule.formula,
    molecularWeight: molecule.molecularWeight,
    smiles,
    cas,
    inchi,
    geneSymbols,
    uniprotAccessions,
  }

  // UniChem crosswalk by InChIKey (best free multi-DB identity layer)
  if (inchiKey && inchiKey.length >= 14) {
    try {
      const mappings = await getUniChemMappings(inchiKey)
      applyUniChemMappings(mappings, identifiers)
    } catch {
      // non-fatal
    }
  }

  // Light gene/protein hints from ChEMBL mechanisms when we have a ChEMBL ID
  if (identifiers.chemblId) {
    try {
      const mechUrl = `https://www.ebi.ac.uk/chembl/api/data/mechanism.json?molecule_chembl_id=${encodeURIComponent(identifiers.chemblId)}&limit=10`
      const mechRes = await fetch(mechUrl, { next: { revalidate: 86400 } })
      if (mechRes.ok) {
        const mechData = await mechRes.json()
        const mechanisms = mechData.mechanisms ?? []
        for (const m of mechanisms) {
          const components = m.target_components ?? []
          for (const c of components) {
            const acc = c.accession || c.component_id
            if (acc && typeof acc === 'string' && !uniprotAccessions.includes(acc)) {
              uniprotAccessions.push(acc)
            }
            const g = c.gene_symbol || c.gene_name
            if (g && typeof g === 'string' && !geneSymbols.includes(g)) {
              geneSymbols.push(g)
            }
          }
          // Some mechanism records put target pref name only
          const pref = m.target_pref_name
          if (pref && typeof pref === 'string' && /^[A-Z0-9-]{2,15}$/.test(pref) && !geneSymbols.includes(pref)) {
            geneSymbols.push(pref)
          }
        }
        identifiers.geneSymbols = geneSymbols
        identifiers.uniprotAccessions = uniprotAccessions
      }
    } catch {
      // non-fatal
    }
  }

  _identifiersCache.set(cid, identifiers)
  return identifiers
}

/**
 * Resolve the query string for a given API source.
 * Prefer structure-stable IDs when configured as defaults.
 * Gene / UniProt types return empty string (not chemical name) when unknown —
 * callers must treat empty as "skip / no hit" rather than searching by drug name.
 */
export function resolveApiQuery(
  identifiers: MoleculeIdentifiers,
  apiSource: string,
  overrides: Record<string, ApiIdentifierType>,
): string {
  const config = API_IDENTIFIER_CONFIGS.find((c) => c.panelId === apiSource)
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
      // Never fall back to chemical name — that causes false UniProt/GWAS hits
      return identifiers.geneSymbols[0] || ''
    case 'uniprot_accession':
      return identifiers.uniprotAccessions[0] || ''
    case 'pdb_id':
      return identifiers.name
    default:
      return identifiers.name
  }
}

/** Prefer ChEMBL ID when available for chembl-family sources. */
export function resolveChemblQuery(
  identifiers: MoleculeIdentifiers,
  fallbackQuery: string,
): string {
  return identifiers.chemblId || fallbackQuery
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

export function clearIdentifierCache(): void {
  _identifiersCache.clear()
}
