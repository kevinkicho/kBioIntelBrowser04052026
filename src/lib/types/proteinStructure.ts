/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Protein & Structure Types
export interface UniprotEntry {
  accession: string
  proteinName: string
  geneName: string
  organism: string
  length?: number
  function?: string
  functionSummary?: string
  subcellularLocation?: string
  pathways?: string[]
}

export interface PdbStructure {
  pdbId: string
  title: string
  resolution: number
  method: string
  releaseDate: string
  organisms: string[]
  chains: string[]
  url?: string
  depositionDate?: string
  /** Space group (crystallography) when reported */
  spaceGroup?: string
  /** e.g. Protein (only) from RCSB selected_polymer_entity_types */
  polymerTypes?: string
  /** Approximate assembly molecular weight (kDa) from RCSB */
  molecularWeightKda?: number
  /** Primary citation DOI */
  citationDoi?: string
  /** Primary citation PubMed id */
  citationPmid?: number | string
  keywords?: string
}

export interface ReactomePathway {
  stId: string
  name: string
  url: string
  species: string
  summation?: string
  reactions?: string[]
}

// AlphaFold Types
export interface AlphaFoldPrediction {
  entryId: string
  uniprotAccession: string
  geneName: string
  organismName: string
  confidenceScore: number
  modelUrl: string
  url: string
}

export interface AtcClassification {
  code: string
  name: string
  classType: string
  /** WHO ATC/DDD Index deep link for the class code */
  url?: string
}

// InterPro Types
export interface ProteinDomain {
  domainId: string
  domainName: string
  name: string
  type: string
  description: string
  start: number
  end: number
  source: string
  url: string
}

// PDBE Ligands Types
export interface PdbeLigand {
  compId: string
  name: string
  formula?: string
  molecularWeight: number
  inchiKey?: string
  drugbankId?: string
  url: string
}

// Protein Atlas Types
export interface ProteinAtlasEntry {
  gene: string
  uniprotId?: string
  subcellularLocations: string[]
  url: string
}

// Protein Feature Types
export interface ProteinFeature {
  featureId: string
  featureName: string
  start: number
  begin: number
  end: number
  description: string
  source: string
  type: string
  url?: string
}

// Protein Interaction Types
export interface ProteinInteraction {
  interactionId: string
  proteinA: string
  proteinB: string
  confidence: number
  source: string
}

// QuickGO Types
export interface GoAnnotation {
  goId: string
  goName: string
  goAspect: string
  qualifier?: string
  evidence?: string
  url: string
}

// CATH/Gene3D Types - Protein Domain Classification
export interface CATHDomain {
  id: string
  domainId: string
  superfamilyId: string
  fold: string
  superfamily: string
  functionalFamily: string
  protein: string
  organism: string
  pdbId: string
  pdbChain: string
  sequence: string
  length: number
  url: string
}

export interface Gene3DEntry {
  id: string
  geneId: string
  geneSymbol: string
  proteinName: string
  organism: string
  domains: CATHDomain[]
  domainArchitecture: string
  url: string
}

// SAbDab Types - Antibody Structure Database
export interface SAbDabEntry {
  id: string
  pdbId: string
  resolution: number
  species: string[]
  heavyChain: string
  lightChain: string
  antigen: string
  antigenType: string
  antibodyType: 'Fab' | 'scFv' | 'VHH' | 'Nanobody' | 'Fab2' | 'IgG'
  cdrSequences: {
    heavy: { cdr1: string; cdr2: string; cdr3: string }
    light: { cdr1: string; cdr2: string; cdr3: string }
  }
  affinity: number | null
  affinityUnits: string
  url: string
}

// UniProt Extended Types
export interface UniProtProtein {
  accession: string
  id: string
  proteinName: string
  geneName: string
  organism: string
  length: number
  sequence: string
  function?: string
  subcellularLocation?: string
  pathways?: string[]
}

// EMBL-EBI Proteins Types
export interface ProteinVariation {
  accession: string
  entryName: string
  geneName: string
  variations: Variation[]
}

export interface Variation {
  type: string
  location: {
    start: number
    end: number
  }
  sequenceVariation?: {
    type: string
    sequence: string
  }
  clinicalSignificance?: string
  source: string
  sourceId: string
  frequency?: {
    value: number
    population?: string
  }
  description?: string
}

export interface ProteomicsMapping {
  accession: string
  entryName: string
  proteomicsData: ProteomicsEntry[]
}

export interface ProteomicsEntry {
  proteinId: string
  peptideCount: number
  uniquePeptideCount: number
  coverage: number
  experiments: string[]
}

export interface CrossReference {
  accession: string
  entryName: string
  crossReferences: {
    database: string
    id: string
    url?: string
  }[]
}

// Human Protein Atlas Types
export interface ProteinAtlasData {
  gene: string
  ensemblId: string
  description?: string
  tissueExpression: ProteinAtlasTissueExpression[]
  cellLineExpression?: ProteinAtlasCellLineExpression[]
  subcellularLocalization?: ProteinAtlasSubcellularLocation[]
}

export interface ProteinAtlasTissueExpression {
  tissue: string
  tissueType: string
  expressionLevel: string
  score: number
  nRna: number
  nProtein: number
}

export interface ProteinAtlasCellLineExpression {
  cellLine: string
  expressionLevel: string
  score: number
}

export interface ProteinAtlasSubcellularLocation {
  location: string
  confidence: string
}
