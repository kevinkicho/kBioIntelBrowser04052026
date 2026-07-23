/**
 * Pure builder: multi-source factual ledger for a molecule profile.
 * No network; uses identity props + category DTO bags already on the page.
 * Does not invent clinical conclusions or regulatory recommendations.
 */

import {
  countDataHubSources,
  isDataHubValueEmpty,
  type DataHubDomain,
  type DataHubLedger,
  type DataHubRow,
  type DataHubSection,
} from './types'

export interface MoleculeIdentityInput {
  cid: number
  name: string
  formula?: string | null
  molecularWeight?: number | null
  inchiKey?: string | null
  iupacName?: string | null
  cas?: string | null
  synonyms?: string[] | null
}

function asArr(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = data[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

function phaseLabel(phase: string | number | null | undefined): string | null {
  if (phase == null || phase === '') return null
  const s = String(phase).trim()
  return s || null
}

function fmtMw(mw: number | null | undefined): string | null {
  if (mw == null || !Number.isFinite(mw) || mw <= 0) return null
  return mw >= 100 ? mw.toFixed(2) : String(Math.round(mw * 100) / 100)
}

function row(
  partial: Omit<DataHubRow, 'value'> & { value: string | null | undefined },
): DataHubRow {
  const value = partial.value?.trim() || '—'
  return { ...partial, value }
}

function section(
  id: string,
  title: string,
  domain: DataHubDomain,
  rows: DataHubRow[],
): DataHubSection {
  return { id, title, domain, rowIds: rows.map((r) => r.id) }
}

/**
 * Build a factual multi-source data hub ledger for one molecule.
 */
export function buildMoleculeDataHub(
  identity: MoleculeIdentityInput,
  data: Record<string, unknown>,
): DataHubLedger {
  const all: DataHubRow[] = []
  const sections: DataHubSection[] = []
  const subjectId = String(identity.cid)
  const subjectLabel = identity.name || `CID ${identity.cid}`

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

  // --- Regulatory / product ---
  const orange = asArr(data, 'orangeBookEntries')
  const ndc = asArr(data, 'ndcProducts')
  const drugsFda = asArr(data, 'drugsFdaApplications')
  const labels = asArr(data, 'drugLabels')
  const ema = asArr(data, 'emaMedicines')
  const hc = asArr(data, 'healthCanadaDpd')
  const firstOb = orange[0]
  const firstLabel = labels[0]
  const firstEma = ema[0]

  const regRows: DataHubRow[] = [
    row({
      id: 'reg-orange-count',
      fact: 'Orange Book entries',
      value: orange.length ? String(orange.length) : null,
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-orange-trade',
      fact: 'Orange Book trade name',
      value: str(firstOb?.tradeName) || str(firstOb?.activeIngredient),
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
      detail: str(firstOb?.applicationNumber) || undefined,
    }),
    row({
      id: 'reg-orange-approval',
      fact: 'Orange Book approval date',
      value: str(firstOb?.approvalDate),
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-ndc',
      fact: 'NDC products',
      value: ndc.length ? String(ndc.length) : null,
      source: 'openFDA NDC',
      panelId: 'ndc',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-drugsfda',
      fact: 'Drugs@FDA applications',
      value: drugsFda.length ? String(drugsFda.length) : null,
      source: 'openFDA Drugs@FDA',
      panelId: 'drugs-fda',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-dailymed',
      fact: 'DailyMed label',
      value: str(firstLabel?.title) || (labels.length ? `${labels.length} label(s)` : null),
      source: 'DailyMed / openFDA',
      sourceUrl: str(firstLabel?.dailyMedUrl) || str(firstLabel?.url) || undefined,
      panelId: 'dailymed',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-ema',
      fact: 'EMA medicine (sample)',
      value: str(firstEma?.name) || str(firstEma?.medicineName) || (ema.length ? String(ema.length) : null),
      source: 'EMA / Open Targets',
      panelId: 'ema-medicines',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
    row({
      id: 'reg-hc',
      fact: 'Health Canada DPD',
      value: hc.length ? String(hc.length) : null,
      source: 'Health Canada DPD',
      panelId: 'health-canada-dpd',
      categoryId: 'pharmaceutical',
      domain: 'regulatory',
    }),
  ]
  all.push(...regRows)
  sections.push(section('regulatory', 'Regulatory & product registers', 'regulatory', regRows))

  // --- Clinical trials ---
  const trials = asArr(data, 'clinicalTrials')
  const isrctn = asArr(data, 'isrctnTrials')
  const indications = asArr(data, 'chemblIndications')
  const phases = new Map<string, number>()
  for (const t of trials) {
    const p = phaseLabel(str(t.phase)) || 'Unknown'
    phases.set(p, (phases.get(p) || 0) + 1)
  }
  const phaseSummary =
    phases.size > 0
      ? Array.from(phases.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([p, c]) => `${p}: ${c}`)
          .join(' · ')
      : null
  const topCondition =
    trials.flatMap((t) => (Array.isArray(t.conditions) ? t.conditions : []))
      .map((c) => str(c))
      .filter(Boolean)[0] || null
  const firstTrial = trials[0]
  const topIndication = indications[0]

  const clinicalRows: DataHubRow[] = [
    row({
      id: 'cl-trial-count',
      fact: 'ClinicalTrials.gov studies',
      value: trials.length ? String(trials.length) : null,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-phases',
      fact: 'Trial phase mix',
      value: phaseSummary,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: 'Counts from loaded page sample — not exhaustive universe',
    }),
    row({
      id: 'cl-top-condition',
      fact: 'Sample condition',
      value: topCondition,
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-sample-nct',
      fact: 'Sample NCT',
      value: str(firstTrial?.nctId),
      source: 'ClinicalTrials.gov',
      sourceUrl: str(firstTrial?.nctId)
        ? `https://clinicaltrials.gov/study/${str(firstTrial?.nctId)}`
        : undefined,
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: str(firstTrial?.status) || undefined,
    }),
    row({
      id: 'cl-sponsor',
      fact: 'Sample sponsor',
      value: str(firstTrial?.sponsor),
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-isrctn',
      fact: 'ISRCTN records',
      value: isrctn.length ? String(isrctn.length) : null,
      source: 'ISRCTN',
      panelId: 'isrctn',
      categoryId: 'clinical-safety',
      domain: 'clinical',
    }),
    row({
      id: 'cl-chembl-ind',
      fact: 'ChEMBL indication (sample)',
      value:
        str(topIndication?.meshHeading) ||
        str(topIndication?.efoTerm) ||
        str(topIndication?.condition) ||
        (indications.length ? `${indications.length} indication(s)` : null),
      source: 'ChEMBL',
      sourceUrl: str(topIndication?.url) || undefined,
      panelId: 'chembl-indications',
      categoryId: 'clinical-safety',
      domain: 'clinical',
      detail: topIndication?.maxPhaseForIndication != null
        ? `max phase ${topIndication.maxPhaseForIndication}`
        : topIndication?.maxPhase != null
          ? `max phase ${topIndication.maxPhase}`
          : undefined,
    }),
  ]
  all.push(...clinicalRows)
  sections.push(section('clinical', 'Clinical development', 'clinical', clinicalRows))

  // --- Targets / mechanisms ---
  const acts = asArr(data, 'chemblActivities')
  const mechs = asArr(data, 'chemblMechanisms')
  const dgidb = asArr(data, 'drugGeneInteractions')
  const iuphar = asArr(data, 'pharmacologyTargets')
  const ot = asArr(data, 'diseaseAssociations')

  const bestAct = [...acts]
    .filter((a) => typeof a.pchemblValue === 'number' && a.pchemblValue > 0)
    .sort((a, b) => Number(b.pchemblValue) - Number(a.pchemblValue))[0] || acts[0]
  const firstMech = mechs[0]
  const firstGene = dgidb[0]

  const targetRows: DataHubRow[] = [
    row({
      id: 'tg-chembl-n',
      fact: 'ChEMBL bioactivities',
      value: acts.length ? String(acts.length) : null,
      source: 'ChEMBL',
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-best-act',
      fact: 'Top ChEMBL activity',
      value: bestAct
        ? [
            str(bestAct.targetName) || 'target',
            bestAct.pchemblValue != null ? `pChEMBL ${bestAct.pchemblValue}` : null,
            str(bestAct.standardType) && bestAct.standardValue != null
              ? `${bestAct.standardType} ${bestAct.standardValue}${bestAct.standardUnits ? ' ' + bestAct.standardUnits : ''}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
      source: 'ChEMBL',
      sourceUrl: str(bestAct?.url) || undefined,
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
      detail: 'Highest pChEMBL in loaded sample',
    }),
    row({
      id: 'tg-mech',
      fact: 'Mechanism (sample)',
      value:
        str(firstMech?.mechanismOfAction) ||
        [str(firstMech?.actionType), str(firstMech?.targetName)].filter(Boolean).join(' · ') ||
        (mechs.length ? `${mechs.length} mechanism(s)` : null),
      source: 'ChEMBL',
      sourceUrl: str(firstMech?.url) || undefined,
      panelId: 'chembl-mechanisms',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-dgidb-n',
      fact: 'DGIdb drug–gene links',
      value: dgidb.length ? String(dgidb.length) : null,
      source: 'DGIdb',
      panelId: 'dgidb',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-top-gene',
      fact: 'DGIdb gene (sample)',
      value: str(firstGene?.geneSymbol) || str(firstGene?.geneName),
      source: 'DGIdb',
      panelId: 'dgidb',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
      detail: str(firstGene?.interactionType) || undefined,
    }),
    row({
      id: 'tg-iuphar',
      fact: 'IUPHAR / GtoP targets',
      value: iuphar.length ? String(iuphar.length) : null,
      source: 'Guide to Pharmacology',
      panelId: 'iuphar',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
    row({
      id: 'tg-ot',
      fact: 'Open Targets associations',
      value: ot.length ? String(ot.length) : null,
      source: 'Open Targets',
      panelId: 'opentargets',
      categoryId: 'bioactivity-targets',
      domain: 'targets',
    }),
  ]
  all.push(...targetRows)
  sections.push(section('targets', 'Targets & mechanisms', 'targets', targetRows))

  // --- Safety ---
  const aes = asArr(data, 'adverseEvents')
  const recalls = asArr(data, 'drugRecalls')
  const shortages = asArr(data, 'drugShortages')
  const sider = asArr(data, 'siderSideEffects')
  const topAe = [...aes].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0]
  const firstRecall = recalls[0]

  const safetyRows: DataHubRow[] = [
    row({
      id: 'sf-faers-n',
      fact: 'FAERS reaction rows',
      value: aes.length ? String(aes.length) : null,
      source: 'openFDA FAERS',
      panelId: 'adverse-events',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: 'Spontaneous reports — not incidence rates',
    }),
    row({
      id: 'sf-faers-top',
      fact: 'Top FAERS reaction (sample)',
      value: str(topAe?.reactionName) || str(topAe?.reaction),
      source: 'openFDA FAERS',
      panelId: 'adverse-events',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: topAe?.count != null ? `n=${topAe.count} in loaded sample` : undefined,
    }),
    row({
      id: 'sf-recalls',
      fact: 'Enforcement recalls',
      value: recalls.length ? String(recalls.length) : null,
      source: 'openFDA Enforcement',
      panelId: 'recalls',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
    row({
      id: 'sf-recall-reason',
      fact: 'Sample recall reason',
      value: firstRecall ? str(firstRecall.reason)?.slice(0, 100) : null,
      source: 'openFDA Enforcement',
      panelId: 'recalls',
      categoryId: 'clinical-safety',
      domain: 'safety',
      detail: str(firstRecall?.classification) || undefined,
    }),
    row({
      id: 'sf-shortages',
      fact: 'Drug shortage rows',
      value: shortages.length ? String(shortages.length) : null,
      source: 'FDA Drug Shortages',
      panelId: 'drug-shortages',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
    row({
      id: 'sf-sider',
      fact: 'SIDER-compatible SE rows',
      value: sider.length ? String(sider.length) : null,
      source: 'openFDA (SIDER-compatible)',
      panelId: 'sider',
      categoryId: 'clinical-safety',
      domain: 'safety',
    }),
  ]
  all.push(...safetyRows)
  sections.push(section('safety', 'Safety signals (public)', 'safety', safetyRows))

  // --- Literature ---
  const lit = asArr(data, 'literature')
  const pubmed = asArr(data, 'pubmedArticles')
  const openalex = asArr(data, 'openAlexWorks')
  const nih = asArr(data, 'nihGrants')
  const patents = asArr(data, 'patents')
  const firstLit = lit[0] || pubmed[0] || openalex[0]

  const litRows: DataHubRow[] = [
    row({
      id: 'lit-epmc',
      fact: 'Europe PMC hits',
      value: lit.length ? String(lit.length) : null,
      source: 'Europe PMC',
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-pubmed',
      fact: 'PubMed hits',
      value: pubmed.length ? String(pubmed.length) : null,
      source: 'PubMed',
      panelId: 'pubmed',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-openalex',
      fact: 'OpenAlex works',
      value: openalex.length ? String(openalex.length) : null,
      source: 'OpenAlex',
      panelId: 'openalex',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-sample-title',
      fact: 'Sample paper title',
      value: str(firstLit?.title)?.slice(0, 140),
      source: str(firstLit?.source) || 'Literature APIs',
      sourceUrl: str(firstLit?.url) || str(firstLit?.doiUrl) || undefined,
      panelId: 'literature',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-nih',
      fact: 'NIH RePORTER grants',
      value: nih.length ? String(nih.length) : null,
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
    row({
      id: 'lit-patents',
      fact: 'Patent hits',
      value: patents.length ? String(patents.length) : null,
      source: 'PatentsView',
      panelId: 'patents',
      categoryId: 'research-literature',
      domain: 'literature',
    }),
  ]
  all.push(...litRows)
  sections.push(section('literature', 'Literature & IP', 'literature', litRows))

  const nonEmpty = all.filter((r) => !isDataHubValueEmpty(r.value))
  // Identity alone is always present once name/cid exist
  const empty = nonEmpty.length <= 2

  return {
    subjectId,
    subjectLabel,
    rows: all,
    sections,
    sourceCount: countDataHubSources(all),
    empty,
    notes: [
      'Facts are copied from free public APIs retrieved for this page — not model-generated claims.',
      'Counts and samples reflect what loaded in this session; Refresh re-queries sources.',
      'Not for clinical or regulatory decision support. Verify in primary sources before wet-lab or grant use.',
    ],
  }
}
