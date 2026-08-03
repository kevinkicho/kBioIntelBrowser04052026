/**
 * Negative / not-retrieved of-record rows: queried empty or never loaded.
 * Empty means not retrieved — never rewrite as zero association.
 */

import { row, section } from './moleculeHubShared'
import type { DataHubRow, DataHubSection } from './types'

/** Expected free-API bag keys → display source for molecule profile. */
export const MOLECULE_EXPECTED_API_BAGS: Array<{
  key: string
  fact: string
  source: string
  panelId?: string
  categoryId?: string
  domain: DataHubRow['domain']
}> = [
  { key: 'clinicalTrials', fact: 'ClinicalTrials.gov interventions', source: 'ClinicalTrials.gov', panelId: 'clinical-trials', categoryId: 'clinical-safety', domain: 'clinical' },
  { key: 'adverseEvents', fact: 'openFDA FAERS reactions', source: 'openFDA FAERS', panelId: 'adverse-events', categoryId: 'clinical-safety', domain: 'safety' },
  { key: 'drugRecalls', fact: 'openFDA recalls', source: 'openFDA recalls', panelId: 'recalls', categoryId: 'clinical-safety', domain: 'safety' },
  { key: 'chemblActivities', fact: 'ChEMBL activities', source: 'ChEMBL', panelId: 'chembl', categoryId: 'bioactivity-targets', domain: 'targets' },
  { key: 'chemblMechanisms', fact: 'ChEMBL mechanisms', source: 'ChEMBL', panelId: 'chembl-mechanisms', categoryId: 'bioactivity-targets', domain: 'targets' },
  { key: 'chemblIndications', fact: 'ChEMBL indications', source: 'ChEMBL', panelId: 'chembl-indications', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'drugGeneInteractions', fact: 'DGIdb interactions', source: 'DGIdb', panelId: 'dgidb', categoryId: 'bioactivity-targets', domain: 'targets' },
  { key: 'literature', fact: 'Europe PMC literature', source: 'Europe PMC', panelId: 'literature', categoryId: 'research-literature', domain: 'literature' },
  { key: 'pubmedArticles', fact: 'PubMed articles', source: 'PubMed', panelId: 'pubmed', categoryId: 'research-literature', domain: 'literature' },
  { key: 'openAlexWorks', fact: 'OpenAlex works', source: 'OpenAlex', panelId: 'openalex', categoryId: 'research-literature', domain: 'literature' },
  { key: 'semanticPapers', fact: 'Semantic Scholar papers', source: 'Semantic Scholar', panelId: 'semantic-scholar', categoryId: 'research-literature', domain: 'literature' },
  { key: 'arxivPapers', fact: 'arXiv papers', source: 'arXiv', panelId: 'arxiv', categoryId: 'research-literature', domain: 'literature' },
  { key: 'crossRefWorks', fact: 'Crossref works', source: 'Crossref', panelId: 'crossref', categoryId: 'research-literature', domain: 'literature' },
  { key: 'nihGrants', fact: 'NIH RePORTER grants', source: 'NIH RePORTER', panelId: 'nih-reporter', categoryId: 'research-literature', domain: 'literature' },
  { key: 'nsfAwards', fact: 'NSF awards', source: 'NSF Awards', panelId: 'nsf-awards', categoryId: 'research-literature', domain: 'literature' },
  { key: 'patents', fact: 'PatentsView patents', source: 'PatentsView', panelId: 'patents', categoryId: 'research-literature', domain: 'literature' },
  { key: 'pdbStructures', fact: 'RCSB PDB structures', source: 'RCSB PDB', panelId: 'pdb', categoryId: 'protein-structure', domain: 'other' },
  { key: 'uniprotEntries', fact: 'UniProt entries', source: 'UniProt', panelId: 'uniprot', categoryId: 'protein-structure', domain: 'other' },
  { key: 'bindingAffinities', fact: 'BindingDB affinities', source: 'BindingDB', panelId: 'bindingdb', categoryId: 'bioactivity-targets', domain: 'targets' },
  { key: 'orangeBookEntries', fact: 'Orange Book entries', source: 'FDA Orange Book', panelId: 'orange-book', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'drugLabels', fact: 'DailyMed labels', source: 'DailyMed', panelId: 'dailymed', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'emaMedicines', fact: 'EMA medicines', source: 'EMA / Open Targets', panelId: 'ema-medicines', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'healthCanadaDpd', fact: 'Health Canada DPD', source: 'Health Canada', panelId: 'health-canada-dpd', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'openAireProjects', fact: 'OpenAIRE projects', source: 'OpenAIRE', panelId: 'openaire-projects', categoryId: 'research-literature', domain: 'literature' },
  { key: 'citationMetrics', fact: 'OpenCitations metrics', source: 'OpenCitations', panelId: 'opencitations', categoryId: 'research-literature', domain: 'literature' },
  { key: 'hazards', fact: 'PubChem GHS hazards', source: 'PubChem', panelId: 'hazards', categoryId: 'clinical-safety', domain: 'safety' },
  { key: 'compToxData', fact: 'EPA CompTox', source: 'EPA CompTox', panelId: 'comptox', categoryId: 'clinical-safety', domain: 'safety' },
  { key: 'alphaFoldPredictions', fact: 'AlphaFold predictions', source: 'AlphaFold DB', panelId: 'alphafold', categoryId: 'protein-structure', domain: 'other' },
  { key: 'purpleBookProducts', fact: 'FDA Purple Book products', source: 'FDA Purple Book', panelId: 'purple-book', categoryId: 'pharmaceutical', domain: 'regulatory' },
  { key: 'whoGhoContext', fact: 'WHO GHO disease context', source: 'WHO GHO', panelId: 'who-gho', categoryId: 'clinical-safety', domain: 'clinical' },
  { key: 'internationalRegulatorLinks', fact: 'International regulator portals', source: 'MHRA/TGA/PMDA portals', panelId: 'international-regulators', categoryId: 'pharmaceutical', domain: 'regulatory' },
]

function bagIsEmpty(data: Record<string, unknown>, key: string): boolean {
  const v = data[key]
  if (v == null) return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

/**
 * Build of-record “not retrieved / empty sample” rows for expected free-API bags.
 * Only for keys present as empty arrays OR missing while category was loaded (_sourceStatus).
 */
export function buildNegativeEvidencePart(
  data: Record<string, unknown>,
  opts?: { onlyLoadedCategories?: boolean },
): { rows: DataHubRow[]; section: DataHubSection | null } {
  const status = data._sourceStatus as Record<string, { status?: string }> | undefined
  const rows: DataHubRow[] = []

  for (const spec of MOLECULE_EXPECTED_API_BAGS) {
    const empty = bagIsEmpty(data, spec.key)
    if (!empty) continue
    // If we have granular status, only emit when empty/error/timeout (not when never attempted)
    if (opts?.onlyLoadedCategories && status) {
      const st = status[spec.key] || status[spec.panelId || '']
      if (!st) continue
      if (st.status === 'loaded' && !empty) continue
    }
    // Always emit when bag key exists as [] (queried empty)
    const keyPresent = Object.prototype.hasOwnProperty.call(data, spec.key)
    if (!keyPresent && !status) continue

    const st = status?.[spec.key] || status?.[spec.panelId || '']
    const statusTag =
      st?.status === 'timeout'
        ? 'timeout'
        : st?.status === 'error'
          ? 'error'
          : keyPresent
            ? 'empty sample'
            : 'not in session bags'

    rows.push(
      row({
        id: `neg-${spec.key}`,
        fact: `${spec.fact} (retrieval)`,
        value: statusTag,
        source: spec.source,
        panelId: spec.panelId,
        categoryId: spec.categoryId,
        domain: spec.domain,
        detail:
          st?.status === 'timeout'
            ? 'Of-record negative evidence: free-API source timed out this session — not “no association.”'
            : 'Of-record negative evidence: query returned no rows or bag not loaded. Not “no association.”',
      }),
    )
  }

  if (rows.length === 0) return { rows: [], section: null }
  return {
    rows,
    section: section(
      'negative-evidence',
      'Not retrieved / empty samples (of-record)',
      'other',
      rows,
    ),
  }
}
