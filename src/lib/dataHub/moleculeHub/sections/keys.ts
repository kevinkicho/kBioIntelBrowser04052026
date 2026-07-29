/**
 * Hub section: Cross-DB entity keys (ATC, RxCUI, ChEMBL, ChEBI, …)
 * Pure; no network.
 */
import {
  asArr,
  row,
  section,
  str,
  type MoleculeIdentityInput,
} from '../../moleculeHubShared'
import type { DataHubRow, DataHubSection } from '../../types'


export function buildKeysPart(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): { rows: DataHubRow[]; sections: DataHubSection[] } {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []

  // --- Cross-DB entity keys (ATC, RxCUI, ChEMBL, ChEBI, …) ---
  const atc = asArr(data, 'atcClassifications')
  const mychem = asArr(data, 'mychemAnnotations')
  const unichem = asArr(data, 'unichemXrefs').length
    ? asArr(data, 'unichemXrefs')
    : asArr(data, 'unichemLinks').length
      ? asArr(data, 'unichemLinks')
      : asArr(data, 'uniChemResults')
  const chebiBag = data.chebiAnnotation
  const chebi =
    chebiBag && typeof chebiBag === 'object' && !Array.isArray(chebiBag)
      ? (chebiBag as Record<string, unknown>)
      : asArr(data, 'chebiAnnotation')[0] || asArr(data, 'chebiAnnotations')[0]
  const drugCentral = data.drugCentralEnhanced
  const dc =
    drugCentral && typeof drugCentral === 'object' && !Array.isArray(drugCentral)
      ? (drugCentral as Record<string, unknown>)
      : null
  const gsrs = asArr(data, 'gsrsSubstances')
  const firstAtc = atc[0]
  const firstMychem = mychem[0]
  const firstAct = asArr(data, 'chemblActivities')[0]
  const firstInd = asArr(data, 'chemblIndications')[0]
  // Prefer molecule ChEMBL id from MyChem / activity molecule field
  const chemblId =
    str(firstMychem?.chemblId) ||
    str(firstAct?.chemblId) ||
    str(firstInd?.moleculeChemblId) ||
    null
  const chebiId =
    str(chebi?.id) ||
    str(chebi?.chebiId) ||
    str(firstMychem?.chebiId) ||
    null
  const drugbankId =
    str(firstMychem?.drugbankId) ||
    str(dc?.drug && typeof dc.drug === 'object' ? (dc.drug as Record<string, unknown>).drugbankId : null) ||
    null
  const rxcui =
    str(firstAtc?.rxcui) ||
    str(data.rxcui) ||
    str(firstMychem?.rxcui) ||
    null
  const atcCode = str(firstAtc?.code)
  const atcName = str(firstAtc?.name)
  const unii = str(gsrs[0]?.unii) || str(gsrs[0]?.UNII) || str(firstMychem?.unii)
  const dcAtc =
    Array.isArray(dc?.atcCodes) && dc!.atcCodes.length
      ? String((dc!.atcCodes as unknown[])[0])
      : null

  const keyRows: DataHubRow[] = [
    row({
      id: 'key-chembl',
      fact: 'ChEMBL ID',
      value: chemblId,
      source: 'ChEMBL / MyChem',
      sourceUrl: chemblId
        ? `https://www.ebi.ac.uk/chembl/explore/compound/${chemblId.toUpperCase().startsWith('CHEMBL') ? chemblId.toUpperCase() : `CHEMBL${chemblId}`}`
        : undefined,
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      domain: 'identity',
      detail: 'Stable compound id for bioactivity join',
    }),
    row({
      id: 'key-chebi',
      fact: 'ChEBI ID',
      value: chebiId,
      source: 'ChEBI / MyChem',
      sourceUrl: chebiId
        ? `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${encodeURIComponent(
            /chebi/i.test(chebiId) ? chebiId : `CHEBI:${chebiId}`,
          )}`
        : undefined,
      panelId: 'chebi',
      categoryId: 'molecular-chemical',
      domain: 'identity',
    }),
    row({
      id: 'key-drugbank',
      fact: 'DrugBank ID',
      value: drugbankId,
      source: 'MyChem / DrugBank xref',
      sourceUrl: drugbankId
        ? `https://go.drugbank.com/drugs/${encodeURIComponent(
            drugbankId.toUpperCase().startsWith('DB') ? drugbankId.toUpperCase() : drugbankId,
          )}`
        : undefined,
      panelId: 'mychem',
      categoryId: 'molecular-chemical',
      domain: 'identity',
      detail: 'Free xref only — not a paid DrugBank product surface',
    }),
    row({
      id: 'key-rxcui',
      fact: 'RxCUI',
      value: rxcui,
      source: 'RxNorm',
      sourceUrl: rxcui
        ? `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${encodeURIComponent(rxcui)}`
        : undefined,
      panelId: 'atc',
      categoryId: 'pharmaceutical',
      domain: 'identity',
    }),
    row({
      id: 'key-atc',
      fact: 'ATC code',
      value: atcCode || dcAtc,
      source: atcCode ? 'RxClass / WHO ATC' : dcAtc ? 'DrugCentral' : 'WHO ATC',
      sourceUrl: atcCode
        ? str(firstAtc?.url) ||
          `https://atcddd.fhi.no/atc_ddd_index/?code=${encodeURIComponent(atcCode)}&showdescription=yes`
        : undefined,
      panelId: 'atc',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
      detail: atcName || undefined,
    }),
    row({
      id: 'key-atc-name',
      fact: 'ATC class name',
      value: atcName,
      source: 'RxClass / WHO ATC',
      panelId: 'atc',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'key-unii',
      fact: 'UNII (GSRS)',
      value: unii,
      source: 'FDA GSRS',
      sourceUrl: unii
        ? `https://precision.fda.gov/uniisearch/srs/unii/${encodeURIComponent(unii)}`
        : undefined,
      panelId: 'gsrs',
      categoryId: 'pharmaceutical',
      domain: 'identity',
    }),
    row({
      id: 'key-unichem-n',
      fact: 'UniChem cross-refs',
      value: unichem.length ? String(unichem.length) : null,
      source: 'UniChem',
      panelId: 'unichem',
      categoryId: 'molecular-chemical',
      domain: 'identity',
    }),
    row({
      id: 'key-mychem-n',
      fact: 'MyChem annotations',
      value: mychem.length ? String(mychem.length) : null,
      source: 'MyChem.info',
      sourceUrl: str(firstMychem?.url) || undefined,
      panelId: 'mychem',
      categoryId: 'molecular-chemical',
      domain: 'identity',
    }),
  ]
  all.push(...keyRows)
  sections.push(section('keys', 'Cross-database identifiers', 'identity', keyRows))


  return { rows: all, sections }
}
