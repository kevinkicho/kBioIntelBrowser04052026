/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Disease Association Types
export interface DiseaseAssociation {
  diseaseId: string
  diseaseName: string
  description?: string
  score: number
  evidenceCount: number
  sources: string[]
  therapeuticAreas?: string[]
}

// MeSH Types
export interface MeshTerm {
  meshId: string
  termName: string
  name: string
  definition: string
  scopeNote?: string
  treeNumbers: string[]
  relatedTerms: string[]
  url: string
}

// Monarch Types
export interface MonarchDisease {
  diseaseId: string
  diseaseName: string
  id: string
  name: string
  geneSymbol: string
  evidence: string
  source: string
  description?: string
  phenotypeCount?: number
  url: string
  pubmedId?: string
}

// NCI Thesaurus Types
export interface NciConcept {
  conceptId: string
  code: string
  name: string
  definition: string
  semanticType: string
  conceptStatus: string
  leaf: boolean
  synonyms: string[]
  parents: string[]
  url: string
}

// DisGeNET Types - Gene-Disease Associations
export interface DisGeNetAssociation {
  geneSymbol: string
  geneId: string
  diseaseId: string
  diseaseName: string
  diseaseType: string
  score: number
  confidenceScore?: number
  source: string
  pmids: string[]
}

// Orphanet Types - Rare Diseases
export interface OrphanetDisease {
  orphaCode: string
  diseaseName: string
  diseaseType: string
  definition: string
  synonyms: string[]
  genes: string[]
  symptoms: string[]
  prevalence: string
  url: string
}

// OMIM Types - Genetic Disorders (requires API key)
export interface OMIMEntry {
  mimNumber: number
  name: string
  prefix: string
  status: string
  description: string
  geneSymbols: string[]
  phenotypes: {
    mimNumber: number
    name: string
    mapping: string
  }[]
  references: {
    pubmedId: number
    title: string
    authors: string
  }[]
  url: string
}

// IEDB Types - Immune Epitopes (requires API key)
export interface IEDBEpitope {
  epitopeId: number
  name: string
  sequence: string
  length: number
  epitopeType: string
  antigenName: string
  antigenId: number
  organismName: string
  organismId: number
  mhcRestriction: string
  assayCount: number
  positiveAssayCount: number
  source: string
  url: string
}

// MedGen Types - Medical Genetics
export interface MedGenConcept {
  conceptId: string
  cui: string
  name: string
  definition: string
  semanticTypes: string[]
  synonyms: string[]
  umlsCui: string
  omimIds: string[]
  url: string
}

// Human Phenotype Ontology Types
export interface HPOTerm {
  id: string
  name: string
  definition?: string
  synonyms: string[]
  parents: string[]
  children: string[]
}

// NINDS NeuroMMSig Types
export interface NeuroMMSigSignature {
  signatureId: string
  name: string
  disease: string
  mechanism: string
  genes: string[]
  drugs: string[]
  evidence?: string
  publications?: string[]
}
