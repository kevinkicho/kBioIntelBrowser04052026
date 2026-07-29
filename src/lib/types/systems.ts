/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Graph Types
export interface GraphNode {
  id: string
  type: 'molecule' | 'company' | 'patent' | 'trial' | 'target' | 'pathway' | 'synthesis' | 'gene' | 'product' | 'publication' | 'grant'
  label: string
  group?: string
  data?: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type?: string
  value?: number
  label?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// IntAct Types
export interface MolecularInteraction {
  interactionId: string
  proteinA: string
  proteinB: string
  interactorA: string
  interactorB: string
  interactionType: string
  detectionMethod: string
  pubmedId: string
  url: string
  confidenceScore?: number
}

// SEC Filing Types
export interface SecFiling {
  filingId: string
  companyName: string
  formType: string
  filingDate: string
  description?: string
  url?: string
}

// STRING Types
export interface StringInteraction {
  proteinA: string
  proteinB: string
  score: number
  experimentalScore?: number
  databaseScore?: number
  textminingScore?: number
  url?: string
}

// BioModels Types
export interface BioModelsModel {
  id: string
  name: string
  description: string
  authors: string[]
  submitter: string
  submitterDate: string
  lastUpdate: string
  modelSize: number
  formats: string[]
  organisms: string[]
  url: string
}

// OLS Types
export interface OLSTerm {
  id: string
  label: string
  iri: string
  ontologyId: string
  description?: string
  synonyms: string[]
  parents: string[]
  children: string[]
  ancestors: string[]
  descendants: string[]
  mappings: { source: string; url: string }[]
}

// BioSamples Types
export interface BioSample {
  id: string
  name: string
  domain: string
  organism: string
  description?: string
  submitter: string
  submissionDate: string
  updateDate: string
  attributes: {
    name: string
    value: string
    unit?: string
    surface?: string
  }[]
  externalReferences: {
    url: string
    label: string
  }[]
  publications: {
    pmid?: string
    doi?: string
  }[]
}

// NCI caDSR Types
export interface CadsrConcept {
  conceptId: string
  preferredName: string
  definition?: string
  context: string
  workflowStatus: string
  evsSource?: string
}

// NCATS Translator Types
export interface TranslatorAssociation {
  subject: string
  predicate: string
  object: string
  edgeLabel: string
  source: string
  publications?: string[]
}

// NHGRI AnVIL Types
export interface AnvilDataset {
  datasetId: string
  name: string
  description?: string
  studyName: string
  consentGroups: string[]
  dataTypes: string[]
  participantCount: number
  sampleCount: number
}

// NIAID ImmPort Types
export interface ImmPortStudy {
  studyId: string
  title: string
  description?: string
  studyType: string
  conditionStudied?: string
  intervention?: string
  participantCount: number
  arms: string[]
  reagents?: string[]
}
