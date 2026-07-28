/**
 * Map free-API catalog utilization: rank gather vs densify vs profile hub.
 * Helps operators see which of 130+ sources power which surface.
 *
 * Strategy to utilize more endpoints:
 * 1. Discover gather — disease→gene→drug cheap signals (OT, DGIdb, CT.gov, ChEMBL, …)
 * 2. Discover densify — top-K safety (FAERS/recalls) + multi-source novelty breadth
 * 3. Profile hub — full category bags → of-record ledger rows (most catalog coverage)
 * 4. Pack extractors — claim-bound subset for board packs
 * 5. Research kit — export of hub + hub-claims-pack
 */

export type UtilizationSurface =
  | 'discover-gather'
  | 'discover-densify'
  | 'discover-similarity'
  | 'profile-hub'
  | 'pack-extractors'
  | 'research-kit'

export interface SourceUtilizationEntry {
  key: string
  label: string
  surfaces: UtilizationSurface[]
}

/** Curated map of free APIs currently wired into product surfaces. */
export const SOURCE_UTILIZATION: SourceUtilizationEntry[] = [
  // --- Discover gather (cheap rank path) ---
  { key: 'opentargets', label: 'Open Targets', surfaces: ['discover-gather', 'profile-hub', 'research-kit'] },
  { key: 'disgenet', label: 'DisGeNET', surfaces: ['discover-gather', 'profile-hub'] },
  { key: 'orphanet', label: 'Orphanet', surfaces: ['discover-gather', 'profile-hub'] },
  { key: 'dgidb', label: 'DGIdb', surfaces: ['discover-gather', 'profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'clinicaltrials', label: 'ClinicalTrials.gov', surfaces: ['discover-gather', 'profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'chembl', label: 'ChEMBL', surfaces: ['discover-gather', 'profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'pubchem', label: 'PubChem', surfaces: ['discover-gather', 'discover-similarity', 'profile-hub', 'research-kit'] },

  // --- Discover densify (top-K safety + multi-source novelty) ---
  { key: 'openfda-faers', label: 'openFDA FAERS', surfaces: ['discover-densify', 'profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'openfda-recalls', label: 'openFDA recalls', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },
  { key: 'europepmc', label: 'Europe PMC', surfaces: ['discover-densify', 'profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'openalex', label: 'OpenAlex', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },
  { key: 'patents', label: 'PatentsView', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },
  { key: 'bindingdb', label: 'BindingDB', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },
  { key: 'semantic-scholar', label: 'Semantic Scholar', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },
  { key: 'nih-reporter', label: 'NIH RePORTER', surfaces: ['discover-densify', 'profile-hub', 'research-kit'] },

  // --- Profile hub / literature category (session bags → ledger) ---
  { key: 'pubmed', label: 'PubMed', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'arxiv', label: 'arXiv', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'crossref', label: 'Crossref', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'nsf-awards', label: 'NSF Awards', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'openaire', label: 'OpenAIRE', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'opencitations', label: 'OpenCitations', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'pdb', label: 'RCSB PDB', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'alphafold', label: 'AlphaFold', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'uniprot', label: 'UniProt', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'dailymed', label: 'DailyMed', surfaces: ['profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'orange-book', label: 'Orange Book', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'ema', label: 'EMA medicines', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'health-canada', label: 'Health Canada DPD', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'iuphar', label: 'Guide to Pharmacology', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'sider', label: 'SIDER', surfaces: ['profile-hub', 'research-kit'] },
  { key: 'chembl-mechanisms', label: 'ChEMBL mechanisms', surfaces: ['profile-hub', 'pack-extractors', 'research-kit'] },
  { key: 'chembl-indications', label: 'ChEMBL indications', surfaces: ['discover-gather', 'profile-hub', 'research-kit'] },
  { key: 'mygene', label: 'MyGene.info', surfaces: ['profile-hub'] },
  { key: 'ensembl', label: 'Ensembl', surfaces: ['profile-hub'] },
  { key: 'reactome', label: 'Reactome', surfaces: ['profile-hub'] },
  { key: 'string-db', label: 'STRING', surfaces: ['profile-hub'] },
  { key: 'gwas-catalog', label: 'GWAS Catalog', surfaces: ['profile-hub'] },
  { key: 'clinvar', label: 'ClinVar', surfaces: ['profile-hub'] },
  { key: 'pharmgkb', label: 'PharmGKB', surfaces: ['profile-hub'] },
  { key: 'drugcentral', label: 'DrugCentral', surfaces: ['profile-hub'] },
  { key: 'rxnorm', label: 'RxNorm', surfaces: ['profile-hub'] },
  { key: 'unichem', label: 'UniChem', surfaces: ['profile-hub'] },
  { key: 'who-gho', label: 'WHO GHO', surfaces: ['profile-hub'] },
  { key: 'ror', label: 'ROR orgs', surfaces: ['profile-hub'] },
]

export function sourcesForSurface(surface: UtilizationSurface): SourceUtilizationEntry[] {
  return SOURCE_UTILIZATION.filter((s) => s.surfaces.includes(surface))
}

export function utilizationSummary(): {
  catalogUnique: number
  wiredCurated: number
  bySurface: Record<UtilizationSurface, number>
} {
  const bySurface = {
    'discover-gather': 0,
    'discover-densify': 0,
    'discover-similarity': 0,
    'profile-hub': 0,
    'pack-extractors': 0,
    'research-kit': 0,
  } as Record<UtilizationSurface, number>
  for (const e of SOURCE_UTILIZATION) {
    for (const s of e.surfaces) bySurface[s]++
  }
  return {
    catalogUnique: 131,
    wiredCurated: SOURCE_UTILIZATION.length,
    bySurface,
  }
}

/** Operator-facing tips for expanding catalog utilization. */
export const UTILIZATION_EXPANSION_NOTES = [
  'Discover densify now multi-sources novelty (EuropePMC + PatentsView + OpenAlex + BindingDB + Semantic Scholar + NIH RePORTER) on top-K only.',
  'Profile hub + Research kit cover the broadest bag set — load all category panels for max of-record facts.',
  'Empty bags are of-record negative evidence (not “no association”) — see hub Not retrieved section.',
  'Rank path stays deterministic and free-API only; AI never rewrites axes or invents endpoints.',
  'To wire a new free API: add client under src/lib/api/, category fetcher bag, hub row, SOURCE_UTILIZATION entry.',
] as const
