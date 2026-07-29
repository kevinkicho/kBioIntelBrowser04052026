/** Domain DTO types — split from monolithic types.ts for maintainability. */
// PathwayCommons Types
export interface PathwayCommonsResult {
  pathwayId: string
  pathwayName: string
  source: string
  interactions: number
  participants: string[]
  dataSource?: string
  name?: string
  numParticipants?: number
  url?: string
}

// WikiPathways Types
export interface WikiPathway {
  id: string
  name: string
  description?: string
  species: string
  url: string
  genes?: string[]
}

// BioCyc Types - Metabolic Pathways
export interface BioCycPathway {
  pathwayId: string
  name: string
  description: string
  organism: string
  url: string
}

// SMPDB Types - Small Molecule Pathways
export interface SMPDBPathway {
  smpdbId: string
  name: string
  description: string
  pathwayType: string
  organism: string
  metabolites: string[]
  enzymes: string[]
  url: string
}

// KEGG Types - Expanded Pathways & Compounds
export interface KEGGPathway {
  id: string
  name: string
  description: string
  class: string
  compounds: string[]
  drugs: string[]
  enzymes: string[]
  genes: string[]
  url: string
  imageUrl: string
}

export interface KEGGCompound {
  id: string
  name: string
  formula: string
  exactMass: number
  molWeight: number
  pathways: string[]
  enzymes: string[]
  reactions: string[]
  dbLinks: { database: string; ids: string[] }[]
  url: string
}

export interface KEGGDrug {
  id: string
  name: string
  formula: string
  exactMass: number
  molWeight: number
  pathways: string[]
  targets: string[]
  ATC: string
  dbLinks: { database: string; ids: string[] }[]
  url: string
}
