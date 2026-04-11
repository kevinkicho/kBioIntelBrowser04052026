import type { BgeeExpression } from '../types'

// Bgee uses SPARQL endpoint
const SPARQL_URL = 'https://www.bgee.org/sparql'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Query Bgee SPARQL endpoint for gene expression
 */
async function querySparql(query: string): Promise<Record<string, unknown>[]> {
  try {
    const url = `${SPARQL_URL}?query=${encodeURIComponent(query)}&format=json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return data.results?.bindings ?? []
  } catch {
    return []
  }
}

/**
 * Get gene expression across tissues for a gene symbol
 */
export async function getGeneExpression(geneSymbol: string): Promise<BgeeExpression[]> {
  const query = `
    PREFIX orth: <http://purl.org/net/orth#>
    PREFIX genex: <http://purl.org/genex#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT DISTINCT ?gene ?geneName ?anatEntity ?anatName ?stage ?stageName ?expression ?score
    WHERE {
      ?gene a orth:Gene ;
            orth:organism ?organism ;
            rdfs:label ?geneName .
      ?organism obo:RO_0002162 <http://purl.uniprot.org/taxonomy/9606> .
      ?gene genex:isExpressedIn ?anatEntity .
      ?anatEntity rdfs:label ?anatName .
      OPTIONAL {
        ?gene genex:hasDevelopmentalStage ?stage .
        ?stage rdfs:label ?stageName .
      }
      OPTIONAL {
        ?expression genex:hasExpressionLevel ?score .
      }
      FILTER(LCASE(STR(?geneName)) = LCASE("${geneSymbol}"))
    }
    LIMIT 50
  `

  const results = await querySparql(query)

  return results.map((binding: Record<string, unknown>) => {
    const gene = binding.gene as { value?: string } | undefined
    const geneName = binding.geneName as { value?: string } | undefined
    const anatEntity = binding.anatEntity as { value?: string } | undefined
    const anatName = binding.anatName as { value?: string } | undefined
    const stage = binding.stage as { value?: string } | undefined
    const stageName = binding.stageName as { value?: string } | undefined
    const score = binding.score as { value?: string } | undefined

    return {
      geneId: gene?.value?.split('/').pop() ?? '',
      geneSymbol: geneName?.value ?? geneSymbol ?? '',
      species: 'Homo sapiens',
      anatomicalEntityId: anatEntity?.value?.split('/').pop() ?? '',
      anatomicalEntityName: anatName?.value ?? '',
      developmentalStageId: stage?.value?.split('/').pop() ?? '',
      developmentalStageName: stageName?.value ?? '',
      expressionLevel: 'present',
      expressionScore: parseFloat(score?.value ?? '0'),
      confidenceScore: 0
    }
  })
}

/**
 * Main export: Get Bgee expression data
 */
export async function getBgeeData(geneSymbol: string): Promise<{
  expressions: BgeeExpression[]
}> {
  const expressions = await getGeneExpression(geneSymbol)

  return {
    expressions: expressions.slice(0, 30)
  }
}