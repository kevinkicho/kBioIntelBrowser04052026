/** Domain DTO types — split from monolithic types.ts for maintainability. */
// Metabolomics Workbench Types
export interface MetaboliteData {
  refmetName: string
  formula: string
  exactMass: number
  mainClass: string
  subClass: string
  hmdbId: string
  pubchemCid?: number
  keggId: string
  chebiId: string
  inchi: string
  inchiKey: string
}

export interface MetabolomicsStudy {
  studyId: string
  title: string
  description: string
  metabolites: number
  samples: number
  organisms: string[]
  doi: string
}

// HMDB Types - Human Metabolome Database
export interface HMDBMetabolite {
  hmdbId: string
  name: string
  formula: string
  molecularWeight: number
  smiles: string
  inchiKey: string
  inchi: string
  description: string
  biospecimens: string[]
  tissues: string[]
  pathways: string[]
  url: string
}

// MassBank Types - Mass Spectrometry
export interface MassBankSpectrum {
  accession: string
  name: string
  formula: string
  mass: number
  ionMode: string
  instrument: string
  collisionEnergy: string
  precursorMz: number
  msLevel: number
  url: string
}

// ChemSpider Types - Chemistry Database
export interface ChemSpiderCompound {
  id: string
  csId: string
  name: string
  synonyms: string[]
  formula: string
  molecularWeight: number
  inChI: string
  inChIKey: string
  smiles: string
  sources: string[]
  image2D: string
  image3D: string
  url: string
}

// MetaboLights Types - Metabolomics Repository
export interface MetaboLightsStudy {
  id: string
  title: string
  description: string
  studyType: string
  organism: string
  organismPart: string
  platform: string
  metabolites: number
  samples: number
  techniques: string[]
  publication: string
  publicationDate: string
  url: string
}

export interface MetaboLightsMetabolite {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  chebiId: string
  hmdbId: string
  smiles: string
  mass: number
  databaseLinks: { database: string; ids: string[] }[]
  url: string
}

// UniChem Types - Chemical Cross-Reference Service
export interface UniChemSource {
  sourceId: string
  name: string
  fullName: string
  url: string
  description: string
}

export interface UniChemMapping {
  sourceId: string
  sourceName: string
  externalId: string
  url: string
  /** Longer registry name when UniChem provides nameLong / nameLabel */
  sourceFullName?: string
  /**
   * Coarse bucket for UI chips: drug | chemistry | metabolomics | structure | assay | other
   */
  sourceCategory?: string
}

// FooDB Types - Food Compound Database
export interface FoodBCompound {
  id: string
  name: string
  description: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  casRegistryNumber: string
  foodSources: string[]
  synonyms: string[]
  url: string
}

// PhytoHub Types - Dietary Phytochemicals
export interface PhytoHubCompound {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  foodSources: string[]
  healthEffects: string[]
  url: string
}

// DFDB Types - Dietary Flavonoid Database
export interface DFDBFlavonoid {
  id: string
  name: string
  formula: string
  inchi: string
  inchiKey: string
  smiles: string
  mass: number
  foodSources: string[]
  subclasses: string[]
  url: string
}

// GNPS Types - Mass Spectrometry Networking
export interface GNPSLibrarySpectrum {
  id: string
  name: string
  precursorMz: number
  mz: number
  ionMode: string
  smiles: string
  inchi: string
  library: string
  sources: string[]
  organism: string
  url: string
}

export interface GNPSNetworkCluster {
  clusterId: string
  parentMass: number
  ionMode: string
  spectraCount: number
  connectedComponents: number
  libraryIdentifications: string[]
  bestMatch: string
  url: string
}

// LIPID MAPS Types
export interface LipidMapsLipid {
  lmId: string
  name: string
  synonyms: string[]
  category: string
  mainClass: string
  subClass: string
  formula: string
  molecularWeight: number
  exactMass: number
  smiles?: string
  inchi?: string
  inchiKey?: string
  url: string
}

// MassIVE Types
export interface MassIVEDataset {
  id: string
  title: string
  description: string
  doi: string
  submitter: string
  submissionDate: string
  updateDate: string
  organism: string
  instrumentType: string
  datasetType: string
  sampleType: string
  lab: string
  contactName: string
  contactEmail: string
  publication?: string
  pubmedId?: string
  fileCount: number
  fileSize: number
  url: string
}
