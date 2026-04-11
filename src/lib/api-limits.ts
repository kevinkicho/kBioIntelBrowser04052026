/**
 * Central API Limits Configuration
 *
 * These limits control how much data is fetched from each API endpoint.
 * Lower initial limits improve page load speed and API etiquette.
 * Users can request more data via "Load More" buttons.
 */
export const LIMITS = {
  // Default limits for all APIs
  DEFAULT_INITIAL: 5,      // Initial fetch - optimized for fast page load
  DEFAULT_LOAD_MORE: 20,   // When user clicks "Load More"
  DEFAULT_MAX: 100,        // Maximum items per panel

  // Per-API overrides based on API capabilities and typical data sizes
  // Some APIs support pagination natively, others don't

  // Tier 1: APIs with native pagination support (can fetch more efficiently)
  CLINICAL_TRIALS: { initial: 5, loadMore: 20, max: 100 },
  PUBMED: { initial: 5, loadMore: 20, max: 50 },
  ARXIV: { initial: 5, loadMore: 20, max: 50 },
  GEO: { initial: 5, loadMore: 20, max: 50 },
  OPEN_ALEX: { initial: 5, loadMore: 20, max: 50 },
  SEMANTIC_SCHOLAR: { initial: 5, loadMore: 20, max: 50 },
  CROSSREF: { initial: 5, loadMore: 20, max: 50 },
  EUROPE_PMC: { initial: 5, loadMore: 20, max: 50 },

  // Tier 2: APIs with partial pagination (can fetch in batches)
  CHEMBL: { initial: 10, loadMore: 50, max: 200 },
  PUBCHEM_COMPOUND: { initial: 5, loadMore: 20, max: 100 },
  PUBCHEM_BIOASSAY: { initial: 10, loadMore: 50, max: 200 },
  DISGENET: { initial: 10, loadMore: 30, max: 100 },
  OPEN_TARGETS: { initial: 10, loadMore: 30, max: 100 },

  // Tier 3: APIs without pagination (fixed result sets or single queries)
  OPENFDA: { initial: 5, loadMore: 20, max: 100 },
  ADVERSE_EVENTS: { initial: 10, loadMore: 50, max: 100 },
  NADAC: { initial: 10, loadMore: 50, max: 200 },
  ORANGE_BOOK: { initial: 10, loadMore: 50, max: 200 },
  DAILYMED: { initial: 5, loadMore: 20, max: 50 },
  CLINVAR: { initial: 10, loadMore: 50, max: 200 },
  GWAS_CATALOG: { initial: 10, loadMore: 50, max: 200 },
  IUPHAR: { initial: 10, loadMore: 50, max: 200 },
  BINDING_DB: { initial: 10, loadMore: 50, max: 200 },
  DGIDB: { initial: 10, loadMore: 50, max: 200 },
  PHAROS: { initial: 10, loadMore: 50, max: 200 },
  STRING: { initial: 10, loadMore: 50, max: 200 },
  STITCH: { initial: 10, loadMore: 50, max: 200 },
  INTACT: { initial: 10, loadMore: 50, max: 200 },
  REACTOME: { initial: 5, loadMore: 20, max: 50 },
  WIKI_PATHWAYS: { initial: 5, loadMore: 20, max: 50 },
  PATHWAY_COMMONS: { initial: 10, loadMore: 50, max: 200 },
  NIH_REPORTER: { initial: 5, loadMore: 20, max: 50 },
  PATENTS: { initial: 5, loadMore: 20, max: 50 },
  SEC_EDGAR: { initial: 5, loadMore: 20, max: 50 },

  // Structural/omics data (typically returns all matches, no pagination)
  UNIPROT: { initial: 10, loadMore: 50, max: 200 },
  PDB: { initial: 10, loadMore: 50, max: 200 },
  ALPHA_FOLD: { initial: 5, loadMore: 20, max: 50 },
  INTER_PRO: { initial: 5, loadMore: 20, max: 50 },
  ENSEMBL: { initial: 5, loadMore: 20, max: 50 },
  NCBI_GENE: { initial: 5, loadMore: 20, max: 50 },
  EXPRESSION_ATLAS: { initial: 5, loadMore: 20, max: 50 },
  PRIDE: { initial: 5, loadMore: 20, max: 50 },

  // Smaller datasets
  PHARMGKB: { initial: 5, loadMore: 20, max: 50 },
  CPIC: { initial: 5, loadMore: 20, max: 50 },

  ISRCTN: { initial: 5, loadMore: 20, max: 50 },
  IRIS: { initial: 5, loadMore: 20, max: 50 },
  TOXCAST: { initial: 5, loadMore: 20, max: 50 },
  SIDER: { initial: 5, loadMore: 20, max: 50 },

  // Additional APIs for Phase 1
  BIOCYC: { initial: 5, loadMore: 20, max: 50 },
  CATH: { initial: 5, loadMore: 20, max: 50 },
  CHEMSPIDER: { initial: 5, loadMore: 20, max: 50 },
  CLINGEN: { initial: 5, loadMore: 20, max: 50 },
  DBSNP: { initial: 5, loadMore: 20, max: 50 },
  GNPS: { initial: 5, loadMore: 20, max: 50 },
  KEGG: { initial: 5, loadMore: 20, max: 50 },
  MASSBANK: { initial: 5, loadMore: 20, max: 50 },
  MEDGEN: { initial: 5, loadMore: 20, max: 50 },
  METABOLIGHTS: { initial: 5, loadMore: 20, max: 50 },

  SABDAB: { initial: 5, loadMore: 20, max: 50 },
  SMPDB: { initial: 5, loadMore: 20, max: 50 },

  // Additional APIs for panels
  FDA_NDC: { initial: 5, loadMore: 20, max: 100 },
  RXNORM: { initial: 10, loadMore: 50, max: 200 },
  ATC: { initial: 5, loadMore: 20, max: 50 },
  DRUGCENTRAL: { initial: 5, loadMore: 20, max: 50 },
  RECALLS: { initial: 5, loadMore: 20, max: 100 },
  EBI_PROTEINS: { initial: 5, loadMore: 20, max: 50 },
  PROTEIN_ATLAS: { initial: 5, loadMore: 20, max: 50 },
  QUICKGO: { initial: 5, loadMore: 20, max: 50 },
  MONARCH: { initial: 5, loadMore: 20, max: 50 },
  MESH: { initial: 5, loadMore: 20, max: 50 },
  CTD: { initial: 10, loadMore: 50, max: 200 },
  IEDB: { initial: 5, loadMore: 20, max: 50 },
  GWAS: { initial: 5, loadMore: 20, max: 50 },

  // Additional APIs for expanded coverage
  BGEE: { initial: 5, loadMore: 20, max: 50 },
  HMDB: { initial: 5, loadMore: 20, max: 50 },
  OMIM: { initial: 5, loadMore: 20, max: 50 },
  ORPHANET: { initial: 5, loadMore: 20, max: 50 },
  COMP_TOX: { initial: 5, loadMore: 20, max: 50 },
  PEPTIDE_ATLAS: { initial: 5, loadMore: 20, max: 50 },
  PDBE_LIGANDS: { initial: 5, loadMore: 20, max: 50 },
  OPEN_CITATIONS: { initial: 5, loadMore: 20, max: 50 },
  RHEA: { initial: 5, loadMore: 20, max: 50 },
  CHEBI: { initial: 5, loadMore: 20, max: 50 },
  MY_CHEM: { initial: 5, loadMore: 20, max: 50 },
  MY_GENE: { initial: 5, loadMore: 20, max: 50 },
  NCI_THESAURUS: { initial: 5, loadMore: 20, max: 50 },
  METABOLOMICS: { initial: 5, loadMore: 20, max: 50 },

  // New APIs (2026-04-09)
  NCBI_EUTILS: { initial: 10, loadMore: 50, max: 200 },
  GTEx: { initial: 5, loadMore: 20, max: 54 }, // 54 tissues
  FDA_DRUG_SHORTAGES: { initial: 5, loadMore: 20, max: 100 },
  LIPID_MAPS: { initial: 5, loadMore: 20, max: 50 },
  BIOMODELS: { initial: 5, loadMore: 20, max: 50 },
  GENE_ONTOLOGY: { initial: 10, loadMore: 50, max: 200 },
  HPO: { initial: 5, loadMore: 20, max: 50 },
  OLS: { initial: 5, loadMore: 20, max: 50 },
} as const

// Type for accessing limits
export type ApiLimitConfig = typeof LIMITS[keyof typeof LIMITS]

// Helper to get limits for an API
export function getLimits(apiName: keyof typeof LIMITS): ApiLimitConfig {
  return LIMITS[apiName] || {
    initial: LIMITS.DEFAULT_INITIAL,
    loadMore: LIMITS.DEFAULT_LOAD_MORE,
    max: LIMITS.DEFAULT_MAX,
  }
}