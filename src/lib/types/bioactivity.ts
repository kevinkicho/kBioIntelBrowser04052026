/** Domain DTO types — split from monolithic types.ts for maintainability. */
// ChEMBL Types
export interface ChemblActivity {
  activityId: string
  targetName: string
  targetOrganism: string
  targetChemblId: string
  chemblId: string
  assayType: string
  standardType: string
  standardValue: number
  standardUnits: string
  pchemblValue: number
  activityType: string
  activityValue: number
  activityUnits: string
  url: string
}

export interface ChemblMechanism {
  mechanismId?: string
  moleculeName?: string
  targetName?: string
  targetChemblId: string
  actionType: string
  mechanismOfAction: string
  directInteraction: boolean
  diseaseEfficacy?: boolean
  url: string
  maxPhase: number
}

export interface ChemblIndication {
  indicationId: string
  moleculeName: string
  /** ChEMBL molecule id e.g. CHEMBL25 — used for stable deep links */
  moleculeChemblId?: string
  condition: string
  maxPhase: number
  maxPhaseForIndication: number
  meshId: string
  meshHeading: string
  efoId: string
  efoTerm: string
  url: string
}

// BindingDB Types
export interface BindingAffinity {
  ligandId: string
  ligandName: string
  targetName: string
  affinityType: string
  affinityValue: number
  affinityUnit: string
  affinityUnits: string
  source?: string
  doi?: string
  kdValue?: number
  kiValue?: number
  ic50Value?: number
}

// BioAssay Types
export interface BioAssayResult {
  assayId: string
  assayName: string
  description: string
  type: string
  outcome: string
  activeCompounds: number
  testedCompounds: number
  url: string
  targetName?: string
  activityValue?: number
}

// CheBI Types
export interface ChebiAnnotation {
  chebiId: string
  name: string
  definition: string
  synonyms?: string[]
  ontology?: string[]
  roles: string[]
  url: string
  formula?: string
  mass?: number
}

// Drug-Gene Interaction Types
export interface DrugGeneInteraction {
  drugName: string
  geneSymbol: string
  geneName: string
  interactionType: string
  evidence: string
  source: string
  url: string
  score: number
}

// IUPHAR Types
export interface PharmacologyTarget {
  targetId: string
  targetName: string
  ligandName: string
  actionType: string
  affinity?: number
  affinityUnit?: string
  url?: string
  primaryTarget?: boolean
  type?: string
  species?: string
}

// Pharos Types
export interface PharosTarget {
  targetId: string
  name: string
  geneSymbol: string
  tdl: string
  druggability: string
  indications: string[]
  family?: string
  description?: string
  novelty?: number
  url: string
}

// STITCH Types
export interface ChemicalProteinInteraction {
  chemicalId: string
  chemicalName: string
  proteinId: string
  proteinName: string
  combinedScore: number
  experimentalScore: number
  databaseScore: number
  textminingScore: number
  url: string
}

// LINCS L1000 Types
export interface LINCSSignature {
  perturbationId: string
  perturbationName: string
  perturbationType: string
  concentration: number
  concentrationUnit: string
  timePoint: string
  cellLine: string
  cellLineName: string
  tissue: string
  upregulatedGenes: string[]
  downregulatedGenes: string[]
  zScore: number
  pValue: number
  similarityScore?: number
}

// TTD (Therapeutic Target Database) Types
export interface TTDTarget {
  id: string
  name: string
  synonym: string[]
  organism: string
  type: string
  function: string
  pathway: string[]
  associatedDiseases: string[]
  drugCount: number
  url: string
}

export interface TTDDrug {
  id: string
  name: string
  synonym: string[]
  type: string
  targets: string[]
  indications: string[]
  url: string
}
