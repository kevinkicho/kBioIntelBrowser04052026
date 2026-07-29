/** Domain DTO types — split from monolithic types.ts for maintainability. */
// ClinVar Types
export interface ClinVarVariant {
  variantId: string
  clinicalSignificance: string
  conditionName: string
  condition?: string
  geneSymbol: string
  gene?: string
  title?: string
  variantType: string
  chromosome: string
  position: number
  reviewStatus: string
  url: string
}

// Ensembl Types
export interface EnsemblGene {
  geneId: string
  symbol: string
  name: string
  displayName: string
  chromosome: string
  start: number
  end: number
  strand: number
  biotype: string
  description?: string
  url: string
}

// Expression Types
export interface GeneExpression {
  geneSymbol: string
  tissueName: string
  expressionLevel: number
  unit: string
  condition: string
  experimentType: string
  experimentDescription: string
  species: string
  url: string
}

// Gene Info Types
export interface GeneInfo {
  geneId: string
  symbol: string
  name: string
  organism: string
  chromosome: string
  mapLocation: string
  summary: string
  url: string
}

// GWAS Types
export interface GwasAssociation {
  studyId: string
  traitName: string
  geneSymbol: string
  pValue: number
  riskAllele: string
  pubmedId: string
  region?: string
  url?: string
}

// MyGene Types - Gene Annotations
export interface MyGeneAnnotation {
  geneId: string
  entrezId?: string
  symbol: string
  name: string
  taxid: number
  ensemblId: string
  uniprotId: string
  summary: string
  aliases: string[]
  typeOfGene: string
  mapLocation: string
  pathways: string[]
  goAnnotations: {
    biologicalProcess: string[]
    molecularFunction: string[]
    cellularComponent: string[]
  }
}

// Bgee Types - Gene Expression
export interface BgeeExpression {
  geneId: string
  geneSymbol: string
  species: string
  anatomicalEntityId: string
  anatomicalEntityName: string
  developmentalStageId: string
  developmentalStageName: string
  expressionLevel: string
  expressionScore: number
  confidenceScore: number
}

// CTD Types - Chemical-Gene-Disease Interactions
export interface CTDInteraction {
  chemicalName: string
  chemicalId: string
  geneSymbol: string
  geneId: string
  interaction: string
  interactionActions: string[]
  pmids: string[]
  source: string
}

export interface CTDDiseaseAssociation {
  diseaseName: string
  diseaseId: string
  geneSymbol: string
  geneId: string
  chemicalName?: string
  chemicalId?: string
  inferenceScore: number
  pmids: string[]
  source: string
}

// PeptideAtlas Types - Proteomics
export interface PeptideAtlasEntry {
  peptideId: string
  sequence: string
  length: number
  proteinNames: string[]
  geneSymbols: string[]
  organism: string
  tissueSource: string
  sampleSource: string
  observations: number
  bestScore: number
  source: string
  url: string
}

// GEO Types - Gene Expression Omnibus
export interface GEODataset {
  geoId: string
  accession: string
  title: string
  summary: string
  organism: string
  platformType: string
  sampleType: string
  seriesType: string
  nSamples: number
  nFeatures: number
  releaseDate: string
  lastUpdate: string
  url: string
}

// dbSNP Types - Genetic Variants
export interface dbSNPVariant {
  rsId: string
  refSNPId: string
  chromosome: string
  position: number
  alleles: string
  clinicalSignificance: string
  clinical: boolean
  frequency: number
  genes: string[]
  clinicalAllele: string
  reviewed: boolean
  url: string
}

// ClinGen Types - Clinical Genomics
export interface ClinGenGeneDisease {
  geneSymbol: string
  geneDiseaseId: string
  diseaseName: string
  diseaseId: string
  validityClassification: string
  validityScore: number
  modeOfInheritance: string
  assertionDate: string
  expertPanel: string
  url: string
}

export interface ClinGenVariant {
  variantId: string
  geneSymbol: string
  variantName: string
  clinicalSignificance: string
  reviewStatus: string
  condition: string
  url: string
}

// PRIDE Types - Proteomics
export interface PRIDEProject {
  accession: string
  title: string
  description: string
  species: string
  tissue: string
  instrument: string
  ptm: string
  disease: string
  submitter: string
  publicationDate: string
  numProteins: number
  numPeptides: number
  numSpectra: number
  url: string
}

// Gene Ontology Types
export interface GOTerm {
  id: string
  label: string
  definition?: string
  aspect: 'biological_process' | 'molecular_function' | 'cellular_component'
  synonyms: string[]
  parents: string[]
  children: string[]
}

// GTEx Types
export interface GTExExpression {
  geneId: string
  geneSymbol: string
  tissueName: string
  tissueCode: string
  tpm: number
  tpmSd: number
  nSamples: number
  rank: number
  percentile: number
}
