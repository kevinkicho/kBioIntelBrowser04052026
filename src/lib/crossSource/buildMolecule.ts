/**
 * Pure builder: molecule profile cross-source evidence breadth from mergedData.
 * No network; reuses category DTO bags already on the page.
 */

import {
  countActiveSources,
  emptyCrossSourceBundle,
  type CrossSourceBundle,
  type CrossSourceFact,
  type CrossSourceGroup,
} from './types'

function arr(data: Record<string, unknown>, key: string): unknown[] {
  const v = data[key]
  return Array.isArray(v) ? v : []
}

function n(data: Record<string, unknown>, key: string): number {
  return arr(data, key).length
}

function fact(
  partial: Omit<CrossSourceFact, 'kind'> & { kind?: CrossSourceFact['kind'] },
): CrossSourceFact {
  return { kind: 'count', ...partial }
}

function topEntityLabel(
  rows: unknown[],
  pick: (row: Record<string, unknown>) => string | undefined,
): string | null {
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue
    const label = pick(r as Record<string, unknown>)?.trim()
    if (label) return label
  }
  return null
}

/**
 * Build multi-source evidence strip for a molecule profile.
 */
export function buildMoleculeCrossSource(
  subjectId: string,
  subjectLabel: string,
  data: Record<string, unknown>,
): CrossSourceBundle {
  const facts: CrossSourceFact[] = []
  const groups: CrossSourceGroup[] = []

  // --- Trials ---
  const trialFacts: CrossSourceFact[] = [
    fact({
      id: 'ct-trials',
      label: 'CT.gov trials',
      value: n(data, 'clinicalTrials'),
      source: 'ClinicalTrials.gov',
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      tone: 'sky',
    }),
    fact({
      id: 'isrctn',
      label: 'ISRCTN',
      value: n(data, 'isrctnTrials'),
      source: 'ISRCTN',
      panelId: 'isrctn',
      categoryId: 'clinical-safety',
      tone: 'sky',
    }),
    fact({
      id: 'chembl-ind',
      label: 'ChEMBL indications',
      value: n(data, 'chemblIndications'),
      source: 'ChEMBL',
      panelId: 'chembl-indications',
      categoryId: 'clinical-safety',
      tone: 'emerald',
    }),
  ]
  const topSponsor = topEntityLabel(arr(data, 'clinicalTrials'), (t) =>
    typeof t.sponsor === 'string' ? t.sponsor : undefined,
  )
  if (topSponsor) {
    trialFacts.push(
      fact({
        id: 'top-sponsor',
        label: 'Top sponsor',
        value: topSponsor.slice(0, 48),
        source: 'ClinicalTrials.gov',
        panelId: 'clinical-trials',
        categoryId: 'clinical-safety',
        kind: 'entity',
        tone: 'sky',
        detail: 'From registered trials on this page',
      }),
    )
  }
  facts.push(...trialFacts)
  groups.push({ id: 'trials', title: 'Trials & indications', factIds: trialFacts.map((f) => f.id) })

  // --- Safety ---
  const safetyFacts: CrossSourceFact[] = [
    fact({
      id: 'faers',
      label: 'FAERS reactions',
      value: n(data, 'adverseEvents'),
      source: 'openFDA FAERS',
      panelId: 'adverse-events',
      categoryId: 'clinical-safety',
      tone: 'amber',
    }),
    fact({
      id: 'recalls',
      label: 'Recalls',
      value: n(data, 'drugRecalls'),
      source: 'openFDA Enforcement',
      panelId: 'recalls',
      categoryId: 'clinical-safety',
      tone: 'rose',
    }),
    fact({
      id: 'sider',
      label: 'SIDER-like SE',
      value: n(data, 'siderSideEffects'),
      source: 'openFDA (SIDER-compatible)',
      panelId: 'sider',
      categoryId: 'clinical-safety',
      tone: 'amber',
    }),
    fact({
      id: 'shortages',
      label: 'Shortages',
      value: n(data, 'drugShortages'),
      source: 'FDA Drug Shortages',
      panelId: 'drug-shortages',
      categoryId: 'clinical-safety',
      tone: 'rose',
    }),
  ]
  facts.push(...safetyFacts)
  groups.push({ id: 'safety', title: 'Safety', factIds: safetyFacts.map((f) => f.id) })

  // --- Targets / bioactivity ---
  const chemblActs = arr(data, 'chemblActivities')
  const iuphar = arr(data, 'pharmacologyTargets')
  const dgidb = arr(data, 'drugGeneInteractions')
  const targetFacts: CrossSourceFact[] = [
    fact({
      id: 'chembl-act',
      label: 'ChEMBL activities',
      value: chemblActs.length,
      source: 'ChEMBL',
      panelId: 'chembl',
      categoryId: 'bioactivity-targets',
      tone: 'emerald',
    }),
    fact({
      id: 'chembl-mech',
      label: 'Mechanisms',
      value: n(data, 'chemblMechanisms'),
      source: 'ChEMBL',
      panelId: 'chembl-mechanisms',
      categoryId: 'bioactivity-targets',
      tone: 'emerald',
    }),
    fact({
      id: 'dgidb',
      label: 'Drug–gene',
      value: dgidb.length,
      source: 'DGIdb',
      panelId: 'dgidb',
      categoryId: 'bioactivity-targets',
      tone: 'violet',
    }),
    fact({
      id: 'iuphar',
      label: 'IUPHAR targets',
      value: iuphar.length,
      source: 'Guide to Pharmacology',
      panelId: 'iuphar',
      categoryId: 'bioactivity-targets',
      tone: 'violet',
    }),
    fact({
      id: 'ot',
      label: 'Open Targets',
      value: n(data, 'diseaseAssociations'),
      source: 'Open Targets',
      panelId: 'opentargets',
      categoryId: 'bioactivity-targets',
      tone: 'cyan',
    }),
  ]
  const topGene = topEntityLabel(dgidb, (r) =>
    typeof r.geneSymbol === 'string' ? r.geneSymbol : undefined,
  )
  if (topGene) {
    targetFacts.push(
      fact({
        id: 'top-gene',
        label: 'Top gene',
        value: topGene,
        source: 'DGIdb',
        panelId: 'dgidb',
        categoryId: 'bioactivity-targets',
        kind: 'entity',
        tone: 'cyan',
      }),
    )
  }
  facts.push(...targetFacts)
  groups.push({ id: 'targets', title: 'Targets & bioactivity', factIds: targetFacts.map((f) => f.id) })

  // --- Literature / IP ---
  const litFacts: CrossSourceFact[] = [
    fact({
      id: 'epmc',
      label: 'Europe PMC',
      value: n(data, 'literature'),
      source: 'Europe PMC',
      panelId: 'literature',
      categoryId: 'research-literature',
      tone: 'amber',
    }),
    fact({
      id: 'pubmed',
      label: 'PubMed',
      value: n(data, 'pubmedArticles'),
      source: 'PubMed',
      panelId: 'pubmed',
      categoryId: 'research-literature',
      tone: 'amber',
    }),
    fact({
      id: 'openalex',
      label: 'OpenAlex',
      value: n(data, 'openAlexWorks'),
      source: 'OpenAlex',
      panelId: 'openalex',
      categoryId: 'research-literature',
      tone: 'amber',
    }),
    fact({
      id: 'nih',
      label: 'NIH grants',
      value: n(data, 'nihGrants'),
      source: 'NIH RePORTER',
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      tone: 'indigo',
    }),
    fact({
      id: 'patents',
      label: 'Patents',
      value: n(data, 'patents'),
      source: 'PatentsView',
      panelId: 'patents',
      categoryId: 'research-literature',
      tone: 'slate',
    }),
  ]
  facts.push(...litFacts)
  groups.push({ id: 'lit', title: 'Literature & grants', factIds: litFacts.map((f) => f.id) })

  // --- Products / identity ---
  const productFacts: CrossSourceFact[] = [
    fact({
      id: 'ndc',
      label: 'NDC',
      value: n(data, 'ndcProducts'),
      source: 'openFDA NDC',
      panelId: 'ndc',
      categoryId: 'pharmaceutical',
      tone: 'emerald',
    }),
    fact({
      id: 'orange',
      label: 'Orange Book',
      value: n(data, 'orangeBookEntries'),
      source: 'FDA Orange Book',
      panelId: 'orange-book',
      categoryId: 'pharmaceutical',
      tone: 'emerald',
    }),
    fact({
      id: 'unichem',
      label: 'UniChem xrefs',
      value: n(data, 'unichemXrefs') || n(data, 'unichemLinks') || n(data, 'uniChemResults'),
      source: 'UniChem',
      panelId: 'unichem',
      categoryId: 'chemical-identity',
      tone: 'cyan',
      kind: 'identity',
    }),
    fact({
      id: 'mychem',
      label: 'MyChem hits',
      value: n(data, 'mychemAnnotations') || n(data, 'myChemResults'),
      source: 'MyChem.info',
      panelId: 'mychem',
      categoryId: 'chemical-identity',
      tone: 'cyan',
      kind: 'identity',
    }),
  ]
  facts.push(...productFacts)
  groups.push({ id: 'products', title: 'Products & identity', factIds: productFacts.map((f) => f.id) })

  // --- Orgs / sites ---
  const orgFacts: CrossSourceFact[] = [
    fact({
      id: 'ror',
      label: 'ROR orgs',
      value: n(data, 'researchOrgs') + n(data, 'researchOrgsLit') + n(data, 'euResearchOrgs'),
      source: 'ROR',
      panelId: 'research-orgs',
      categoryId: 'research-literature',
      tone: 'violet',
      kind: 'org',
    }),
    fact({
      id: 'hospitals',
      label: 'CMS hospitals',
      value: n(data, 'usHospitals'),
      source: 'CMS Care Compare',
      panelId: 'us-hospitals',
      categoryId: 'clinical-safety',
      tone: 'rose',
      kind: 'org',
    }),
    fact({
      id: 'colleges',
      label: 'US colleges',
      value: n(data, 'usColleges'),
      source: 'College Scorecard',
      panelId: 'us-colleges',
      categoryId: 'research-literature',
      tone: 'indigo',
      kind: 'org',
    }),
  ]
  facts.push(...orgFacts)
  groups.push({ id: 'orgs', title: 'Orgs & sites', factIds: orgFacts.map((f) => f.id) })

  const sourceCount = countActiveSources(facts)
  const empty = sourceCount === 0
  const notes: string[] = []
  if (empty) {
    notes.push(
      'Load Core and Research categories to fill this multi-source view. Each chip opens the siloed source panel.',
    )
  } else {
    notes.push(
      `Joined ${sourceCount} free public sources already loaded on this page. Open a chip for the full table — list cards stay one-API for provenance.`,
    )
  }

  return {
    subjectId,
    subjectLabel,
    surface: 'molecule',
    facts,
    groups,
    notes,
    empty,
    sourceCount,
  }
}

/** For tests / summary: number of groups with any non-empty fact. */
export function moleculeCrossSourceActiveGroupCount(bundle: CrossSourceBundle): number {
  if (bundle.empty) return 0
  let nActive = 0
  for (const g of bundle.groups) {
    const has = g.factIds.some((id) => {
      const f = bundle.facts.find((x) => x.id === id)
      if (!f) return false
      return !(
        f.value === 0 ||
        f.value === '—' ||
        f.value === '' ||
        (typeof f.value === 'number' && Number.isNaN(f.value))
      )
    })
    if (has) nActive++
  }
  return nActive
}

export function emptyMoleculeCrossSource(
  subjectId: string,
  subjectLabel: string,
): CrossSourceBundle {
  return emptyCrossSourceBundle(subjectId, subjectLabel, 'molecule', [
    'No category data merged yet.',
  ])
}
