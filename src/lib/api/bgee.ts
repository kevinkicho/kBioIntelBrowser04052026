import type { BgeeExpression } from '../types'

// Bgee uses SPARQL endpoint
const SPARQL_URL = 'https://www.bgee.org/sparql'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/** Labels too generic to show as tissue rows */
const GENERIC_ANAT = new Set([
  'cell',
  'anatomical entity',
  'anatomical structure',
  'multicellular organism',
  'organism',
  'whole organism',
  'material anatomical entity',
  'independent continuum',
  'continuant',
])

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

function lit(binding: Record<string, unknown> | undefined, key: string): string {
  const v = binding?.[key] as { value?: string } | undefined
  return v?.value?.trim() ?? ''
}

/**
 * Get gene expression across human tissues (UBERON anatomy preferred).
 * Avoids generic CL "cell" root labels that dominated the prior query.
 */
export async function getGeneExpression(geneSymbol: string): Promise<BgeeExpression[]> {
  const safe = geneSymbol.replace(/["\\\n\r]/g, '').trim()
  if (safe.length < 1) return []

  // Prefer UBERON tissues/organs — isExpressedIn alone returns many CL_* "cell" roots.
  const query = `
    PREFIX orth: <http://purl.org/net/orth#>
    PREFIX genex: <http://purl.org/genex#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT DISTINCT ?gene ?geneName ?anatEntity ?anatName ?stage ?stageName
    WHERE {
      ?gene a orth:Gene ;
            orth:organism ?organism ;
            rdfs:label ?geneName .
      ?organism obo:RO_0002162 <http://purl.uniprot.org/taxonomy/9606> .
      ?gene genex:isExpressedIn ?anatEntity .
      ?anatEntity rdfs:label ?anatName .
      FILTER(LCASE(STR(?geneName)) = LCASE("${safe}"))
      FILTER(CONTAINS(STR(?anatEntity), "UBERON"))
      OPTIONAL {
        ?gene genex:hasDevelopmentalStage ?stage .
        ?stage rdfs:label ?stageName .
      }
    }
    LIMIT 80
  `

  const results = await querySparql(query)

  const mapped = results.map((binding: Record<string, unknown>) => {
    const geneUri = lit(binding, 'gene')
    const anatUri = lit(binding, 'anatEntity')
    const anatName = lit(binding, 'anatName')
    const stageName = lit(binding, 'stageName')
    return {
      geneId: geneUri.split('/').pop()?.replace(/^GENE_/, '') ?? '',
      geneSymbol: lit(binding, 'geneName') || safe,
      species: 'Homo sapiens',
      anatomicalEntityId: anatUri.split('/').pop() ?? '',
      anatomicalEntityName: anatName,
      developmentalStageId: lit(binding, 'stage').split('/').pop() ?? '',
      developmentalStageName: stageName,
      expressionLevel: 'present' as const,
      expressionScore: 0,
      confidenceScore: 0,
    }
  })

  // Deduplicate by anatomy label; drop generic terms
  const seen = new Set<string>()
  const out: BgeeExpression[] = []
  for (const row of mapped) {
    const name = row.anatomicalEntityName.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (GENERIC_ANAT.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length >= 30) break
  }

  // Fallback: if UBERON filter empty, use CL terms but still drop "cell"
  if (out.length === 0) {
    const fallbackQ = `
      PREFIX orth: <http://purl.org/net/orth#>
      PREFIX genex: <http://purl.org/genex#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX obo: <http://purl.obolibrary.org/obo/>
      SELECT DISTINCT ?gene ?geneName ?anatEntity ?anatName
      WHERE {
        ?gene a orth:Gene ;
              orth:organism ?organism ;
              rdfs:label ?geneName .
        ?organism obo:RO_0002162 <http://purl.uniprot.org/taxonomy/9606> .
        ?gene genex:isExpressedIn ?anatEntity .
        ?anatEntity rdfs:label ?anatName .
        FILTER(LCASE(STR(?geneName)) = LCASE("${safe}"))
        FILTER(!REGEX(STR(?anatEntity), "CL_0000000$"))
      }
      LIMIT 60
    `
    const fb = await querySparql(fallbackQ)
    for (const binding of fb) {
      const anatName = lit(binding, 'anatName')
      const key = anatName.toLowerCase()
      if (!anatName || GENERIC_ANAT.has(key) || seen.has(key)) continue
      seen.add(key)
      const geneUri = lit(binding, 'gene')
      const anatUri = lit(binding, 'anatEntity')
      out.push({
        geneId: geneUri.split('/').pop()?.replace(/^GENE_/, '') ?? '',
        geneSymbol: lit(binding, 'geneName') || safe,
        species: 'Homo sapiens',
        anatomicalEntityId: anatUri.split('/').pop() ?? '',
        anatomicalEntityName: anatName,
        developmentalStageId: '',
        developmentalStageName: '',
        expressionLevel: 'present',
        expressionScore: 0,
        confidenceScore: 0,
      })
      if (out.length >= 30) break
    }
  }

  return out
}

/**
 * Main export: Get Bgee expression data
 */
export async function getBgeeData(geneSymbol: string): Promise<{
  expressions: BgeeExpression[]
}> {
  const expressions = await getGeneExpression(geneSymbol)

  return {
    expressions: expressions.slice(0, 30),
  }
}
