/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Molecule Classification Type
export type MoleculeClassification = 'therapeutic' | 'enzyme' | 'reagent' | 'industrial' | 'diagnostic' | 'metabolite' | 'unknown'

// PubChem Types
export interface BaseMoleculeData {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  synonyms: string[]
  inchiKey: string
  iupacName: string
  classification: MoleculeClassification
  structureImageUrl: string
  description?: string
}

export type Molecule = BaseMoleculeData

export interface SearchResult {
  cid: number
  name: string
  formula: string
}

export interface ComputedProperties {
  xLogP: number | null
  tpsa: number | null
  hBondDonorCount: number
  hBondAcceptorCount: number
  complexity: number
  exactMass: number
  charge: number
  rotatableBondCount: number
}

// Synthesis Types
export interface SynthesisRoute {
  method: string
  description: string
  keggReactionIds: string[]
  enzymesInvolved: string[]
  precursors: string[]
  source: 'kegg' | 'rhea'
}

// Related Compound Types
export interface RelatedCompound {
  compoundId: string
  compoundName: string
  name: string
  similarity: number
  relationship: string
  chemblId: string
  maxPhase: number
  activityValue?: number
  activityUnits?: string
  activityType?: string
  /** pChEMBL when available (higher = more potent) */
  pchemblValue?: number | null
  /** Target this competitor was measured against */
  targetChemblId?: string
  targetName?: string
  /** Deep link to ChEMBL compound explore page */
  url?: string
}

// Similar Molecule Types
export interface SimilarMolecule {
  cid: number
  name: string
  similarity: number
  formula: string
}

// MyChem Types - Chemical Annotations
export interface MyChemAnnotation {
  chemblId: string
  pubchemCid: string
  chebiId: string
  inchiKey: string
  drugbankId: string
  name: string
  synonyms: string[]
  formula: string
  molecularWeight: number
  smiles: string
  sources: string[]
  /** MyChem annotation deep link: https://mychem.info/v1/chem/{id} */
  url?: string
  chembl?: {
    moleculeType: string
    maxPhase: number
    indications: string[]
  }
  chebi?: {
    name: string
    definition: string
    parentIds: string[]
  }
  drugbank?: {
    categories: string[]
    groups: string[]
    atcCodes: string[]
  }
}

