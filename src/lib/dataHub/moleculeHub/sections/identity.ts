/**
 * Hub section: Identity (PubChem / structure shell)
 * Pure; no network.
 */
import {
  asArr,
  fmtMw,
  phaseLabel,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'

export function buildIdentityPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Identity (PubChem / structure shell) ---
  const identityRows: DataHubRow[] = [
    row({
      id: 'id-name',
      fact: 'Preferred name',
      value: identity.name || null,
      source: 'PubChem / identity',
      sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${identity.cid}`,
      domain: 'identity',
    }),
    row({
      id: 'id-cid',
      fact: 'PubChem CID',
      value: String(identity.cid),
      source: 'PubChem',
      sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${identity.cid}`,
      domain: 'identity',
    }),
    row({
      id: 'id-inchikey',
      fact: 'InChIKey',
      value: identity.inchiKey || null,
      source: 'PubChem',
      sourceUrl: identity.inchiKey
        ? `https://pubchem.ncbi.nlm.nih.gov/compound/${identity.cid}`
        : undefined,
      domain: 'identity',
      detail: 'Structure hash for cross-DB join',
    }),
    row({
      id: 'id-formula',
      fact: 'Molecular formula',
      value: identity.formula || null,
      source: 'PubChem',
      domain: 'identity',
    }),
    row({
      id: 'id-mw',
      fact: 'Molecular weight',
      value: fmtMw(identity.molecularWeight ?? null),
      source: 'PubChem',
      domain: 'chemistry',
      detail: fmtMw(identity.molecularWeight ?? null) ? 'g/mol' : undefined,
    }),
    row({
      id: 'id-cas',
      fact: 'CAS RN',
      value: identity.cas || null,
      source: 'PubChem / registry',
      domain: 'identity',
    }),
    row({
      id: 'id-iupac',
      fact: 'IUPAC name',
      value: identity.iupacName ? identity.iupacName.slice(0, 120) : null,
      source: 'PubChem',
      domain: 'identity',
      detail: identity.iupacName && identity.iupacName.length > 120 ? 'truncated' : undefined,
    }),
  ]
  if (identity.synonyms?.length) {
    identityRows.push(
      row({
        id: 'id-synonyms',
        fact: 'Synonyms (sample)',
        value: identity.synonyms.slice(0, 4).join('; '),
        source: 'PubChem',
        domain: 'identity',
        detail: `${identity.synonyms.length} total`,
      }),
    )
  }
  all.push(...identityRows)
  sections.push(section('identity', 'Identity', 'identity', identityRows))


  return { rows: all, sections }
}
