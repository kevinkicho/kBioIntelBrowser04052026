/**
 * ROBOKOP API Client
 * 
 * ROBOKOP (Reasoning Over Biomedical Objects linked in Knowledge Oriented Pathways)
 * is a knowledge graph system that integrates multiple biomedical data sources.
 * 
 * API Base: https://robokop-automat.apps.renci.org/
 * Documentation: https://robokop.renci.org/developer-tools
 */

import type { DrugCentralDrug, DrugCentralTarget } from '../types'

const BASE_URL = 'https://robokop-automat.apps.renci.org'

// ROBOKOP specific types
export interface RobokopChemical {
  id: string
  name: string
  category: string[]
  equivalent_identifiers?: string[]
  descriptions?: string[]
  sources?: Record<string, unknown>
}

export interface RobokopDisease {
  id: string
  name: string
  category: string[]
}

export interface RobokopGene {
  id: string
  name: string
  category: string[]
}

export interface RobokopAssociation {
  edge: {
    predicate: string
    source: string
    target: string
  }
  source: RobokopChemical | RobokopDisease | RobokopGene
  target: RobokopChemical | RobokopDisease | RobokopGene
}

export interface RobokopQueryResult {
  message: {
    query_graph: unknown
    knowledge_graph: {
      nodes: Record<string, RobokopNode>
      edges: Record<string, RobokopEdge>
    }
    results: Array<{
      node_bindings: Record<string, Array<{ id: string }>>
      edge_bindings: Record<string, Array<{ id: string }>>
    }>
  }
}

export interface RobokopNode {
  name: string
  categories: string[]
  attributes?: Array<{
    attribute_type_id: string
    value: unknown
  }>
}

export interface RobokopEdge {
  predicate: string
  subject: string
  object: string
  sources?: Array<{
    resource_id: string
    resource_role: string
  }>
  attributes?: Array<{
    attribute_type_id: string
    value: unknown
  }>
}

// TRAPI Query interface
interface TRAPIQuery {
  message: {
    query_graph: {
      nodes: Record<string, {
        ids?: string[]
        categories?: string[]
        name?: string
      }>
      edges: Record<string, {
        subject: string
        object: string
        predicates?: string[]
      }>
    }
  }
}

const fetchOptions: RequestInit = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  next: { revalidate: 86400 }
}

/**
 * Search for a chemical/drug by name in ROBOKOP
 */
async function searchChemicalByName(name: string): Promise<string | null> {
  try {
    const query: TRAPIQuery = {
      message: {
        query_graph: {
          nodes: {
            chemical: {
              categories: ['biolink:ChemicalEntity', 'biolink:ChemicalSubstance', 'biolink:Drug'],
              name: name
            }
          },
          edges: {}
        }
      }
    }

    const res = await fetch(`${BASE_URL}/query`, {
      ...fetchOptions,
      body: JSON.stringify(query)
    })

    if (!res.ok) return null
    const data: RobokopQueryResult = await res.json()
    
    // Extract the first chemical node ID
    const nodes = Object.keys(data.message.knowledge_graph.nodes)
    return nodes.length > 0 ? nodes[0] : null
  } catch (error) {
    console.error('ROBOKOP search error:', error)
    return null
  }
}

/**
 * Query ROBOKOP for chemical-disease associations
 */
export async function getChemicalDiseases(chemicalId: string): Promise<RobokopDisease[]> {
  try {
    const query: TRAPIQuery = {
      message: {
        query_graph: {
          nodes: {
            chemical: {
              ids: [chemicalId],
              categories: ['biolink:ChemicalEntity', 'biolink:Drug']
            },
            disease: {
              categories: ['biolink:Disease', 'biolink:DiseaseOrPhenotypicFeature']
            }
          },
          edges: {
            e0: {
              subject: 'chemical',
              object: 'disease',
              predicates: ['biolink:treats', 'biolink:associated_with', 'biolink:causes']
            }
          }
        }
      }
    }

    const res = await fetch(`${BASE_URL}/query`, {
      ...fetchOptions,
      body: JSON.stringify(query)
    })

    if (!res.ok) return []
    const data: RobokopQueryResult = await res.json()
    
    const diseases: RobokopDisease[] = []
    Object.entries(data.message.knowledge_graph.nodes).forEach(([id, node]) => {
      if (node.categories.some(c => c.includes('Disease'))) {
        diseases.push({
          id,
          name: node.name,
          category: node.categories
        })
      }
    })
    
    return diseases
  } catch (error) {
    console.error('ROBOKOP disease query error:', error)
    return []
  }
}

/**
 * Query ROBOKOP for chemical-gene (target) associations
 */
export async function getChemicalTargets(chemicalId: string): Promise<RobokopGene[]> {
  try {
    const query: TRAPIQuery = {
      message: {
        query_graph: {
          nodes: {
            chemical: {
              ids: [chemicalId],
              categories: ['biolink:ChemicalEntity', 'biolink:Drug']
            },
            gene: {
              categories: ['biolink:Gene', 'biolink:Protein']
            }
          },
          edges: {
            e0: {
              subject: 'chemical',
              object: 'gene',
              predicates: ['biolink:interacts_with', 'biolink:affects', 'biolink:binds']
            }
          }
        }
      }
    }

    const res = await fetch(`${BASE_URL}/query`, {
      ...fetchOptions,
      body: JSON.stringify(query)
    })

    if (!res.ok) return []
    const data: RobokopQueryResult = await res.json()
    
    const genes: RobokopGene[] = []
    Object.entries(data.message.knowledge_graph.nodes).forEach(([id, node]) => {
      if (node.categories.some(c => c.includes('Gene') || c.includes('Protein'))) {
        genes.push({
          id,
          name: node.name,
          category: node.categories
        })
      }
    })
    
    return genes
  } catch (error) {
    console.error('ROBOKOP target query error:', error)
    return []
  }
}

/**
 * Query ROBOKOP for chemical-phenotype associations (side effects)
 */
export async function getChemicalPhenotypes(chemicalId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const query: TRAPIQuery = {
      message: {
        query_graph: {
          nodes: {
            chemical: {
              ids: [chemicalId],
              categories: ['biolink:ChemicalEntity', 'biolink:Drug']
            },
            phenotype: {
              categories: ['biolink:PhenotypicFeature', 'biolink:OntologyClass']
            }
          },
          edges: {
            e0: {
              subject: 'chemical',
              object: 'phenotype',
              predicates: ['biolink:causes', 'biolink:associated_with']
            }
          }
        }
      }
    }

    const res = await fetch(`${BASE_URL}/query`, {
      ...fetchOptions,
      body: JSON.stringify(query)
    })

    if (!res.ok) return []
    const data: RobokopQueryResult = await res.json()
    
    const phenotypes: Array<{ id: string; name: string }> = []
    Object.entries(data.message.knowledge_graph.nodes).forEach(([id, node]) => {
      if (node.categories.some(c => c.includes('Phenotypic') || c.includes('Ontology'))) {
        phenotypes.push({ id, name: node.name })
      }
    })
    
    return phenotypes
  } catch (error) {
    console.error('ROBOKOP phenotype query error:', error)
    return []
  }
}

/**
 * Get comprehensive ROBOKOP data for a chemical/drug
 * This replaces DrugCentral functionality
 */
export async function getRobokopData(name: string): Promise<{
  chemical: RobokopChemical | null
  diseases: RobokopDisease[]
  targets: RobokopGene[]
  phenotypes: Array<{ id: string; name: string }>
}> {
  const chemicalId = await searchChemicalByName(name)
  
  if (!chemicalId) {
    return {
      chemical: null,
      diseases: [],
      targets: [],
      phenotypes: []
    }
  }

  const chemical: RobokopChemical = {
    id: chemicalId,
    name: name,
    category: ['biolink:ChemicalEntity']
  }

  const [diseases, targets, phenotypes] = await Promise.all([
    getChemicalDiseases(chemicalId),
    getChemicalTargets(chemicalId),
    getChemicalPhenotypes(chemicalId)
  ])

  return {
    chemical,
    diseases,
    targets,
    phenotypes
  }
}

/**
 * Convert ROBOKOP data to DrugCentral-compatible format
 * For backwards compatibility with existing components
 */
export async function getRobokopAsDrugCentral(name: string): Promise<{
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
}> {
  const data = await getRobokopData(name)
  
  if (!data.chemical) {
    return { drug: null, targets: [] }
  }

  const drug: DrugCentralDrug = {
    id: parseInt(data.chemical.id.replace(/\D/g, '').slice(0, 10)) || 0,
    name: data.chemical.name,
    synonym: [],
    indication: data.diseases.map(d => d.name),
    actionType: [],
    routes: [],
    faers: [],
    targets: [],
    atcCodes: []
  }

  const targets: DrugCentralTarget[] = data.targets.map((gene, idx) => ({
    targetId: idx,
    targetName: gene.name,
    geneSymbol: gene.name,
    uniprotId: '',
    actionType: 'interacts_with',
    actionCode: '',
    drugId: drug.id
  }))

  return { drug, targets }
}

/**
 * Get meta knowledge graph from ROBOKOP
 * Shows what types and predicates are available
 */
export async function getRobokopMetaKG(): Promise<{
  nodes: Record<string, unknown>
  edges: Array<{ subject: string; predicate: string; object: string }>
} | null> {
  try {
    const res = await fetch(`${BASE_URL}/meta_knowledge_graph`)
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error('ROBOKOP meta KG error:', error)
    return null
  }
}
