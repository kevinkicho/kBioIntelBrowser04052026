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
    // Prefer POST + Accept so Cloudflare / intermediaries return JSON when possible
    const res = await fetch(`${SPARQL_URL}/`, {
      ...fetchOptions,
      method: 'POST',
      headers: {
        Accept: 'application/sparql-results+json, application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `query=${encodeURIComponent(query)}&format=json`,
    })
    if (res.ok) {
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const data = await res.json()
        return data.results?.bindings ?? []
      }
    }
    // GET fallback (some Bgee deployments only allow GET)
    const url = `${SPARQL_URL}?query=${encodeURIComponent(query)}&format=json`
    const getRes = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/sparql-results+json, application/json' },
    })
    if (!getRes.ok) return []
    const data = await getRes.json()
    return data.results?.bindings ?? []
  } catch {
    return []
  }
}

function lit(binding: Record<string, unknown> | undefined, key: string): string {
  const v = binding?.[key] as { value?: string } | undefined
  return v?.value?.trim() ?? ''
}

function num(binding: Record<string, unknown> | undefined, key: string): number {
  const raw = lit(binding, key)
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function shortId(uri: string): string {
  if (!uri) return ''
  const last = uri.split('/').pop() ?? uri
  return last.replace(/^GENE_/, '').replace(/^UBERON_/, 'UBERON:').replace(/^CL_/, 'CL:')
}

function mapBinding(
  binding: Record<string, unknown>,
  fallbackSymbol: string,
): BgeeExpression {
  const geneUri = lit(binding, 'gene')
  const anatUri = lit(binding, 'anatEntity')
  const stageUri = lit(binding, 'stage')
  const level = lit(binding, 'level') || lit(binding, 'exprLevel') || 'present'
  const score = num(binding, 'score') || num(binding, 'exprScore')
  const conf = num(binding, 'confidence') || num(binding, 'quality')
  return {
    geneId: shortId(geneUri),
    geneSymbol: lit(binding, 'geneName') || fallbackSymbol,
    species: lit(binding, 'species') || 'Homo sapiens',
    anatomicalEntityId: shortId(anatUri),
    anatomicalEntityName: lit(binding, 'anatName'),
    developmentalStageId: shortId(stageUri),
    developmentalStageName: lit(binding, 'stageName'),
    expressionLevel: level,
    expressionScore: score,
    confidenceScore: conf,
  }
}

function pushUnique(
  out: BgeeExpression[],
  seen: Set<string>,
  row: BgeeExpression,
): void {
  const name = row.anatomicalEntityName.trim()
  if (!name) return
  const key = `${name.toLowerCase()}|${row.developmentalStageName.toLowerCase()}`
  if (GENERIC_ANAT.has(name.toLowerCase())) return
  if (seen.has(key)) return
  seen.add(key)
  out.push(row)
}

/**
 * Get gene expression across human tissues (UBERON anatomy preferred).
 * Tries expression-call query first (level / score when available), then isExpressedIn.
 */
export async function getGeneExpression(geneSymbol: string): Promise<BgeeExpression[]> {
  const safe = geneSymbol.replace(/["\\\n\r]/g, '').trim()
  if (safe.length < 1) return []

  const seen = new Set<string>()
  const out: BgeeExpression[] = []

  // Richer call-based query (Bgee genex Expression calls).
  // Stage often hangs off genex:hasCondition; scores use several property aliases.
  const callQuery = `
    PREFIX orth: <http://purl.org/net/orth#>
    PREFIX genex: <http://purl.org/genex#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX obo: <http://purl.obolibrary.org/obo/>
    SELECT DISTINCT ?gene ?geneName ?anatEntity ?anatName ?stage ?stageName ?level ?score ?confidence
    WHERE {
      ?gene a orth:Gene ;
            orth:organism ?organism ;
            rdfs:label ?geneName .
      ?organism obo:RO_0002162 <http://purl.uniprot.org/taxonomy/9606> .
      FILTER(LCASE(STR(?geneName)) = LCASE("${safe}"))
      ?call a genex:Expression ;
            genex:hasGene ?gene ;
            genex:hasAnatomicalEntity ?anatEntity .
      ?anatEntity rdfs:label ?anatName .
      FILTER(CONTAINS(STR(?anatEntity), "UBERON") || CONTAINS(STR(?anatEntity), "CL_"))
      OPTIONAL {
        ?call genex:hasDevelopmentalStage ?stage .
        ?stage rdfs:label ?stageName .
      }
      OPTIONAL {
        ?call genex:hasCondition ?cond .
        ?cond genex:hasDevelopmentalStage ?stage .
        ?stage rdfs:label ?stageName .
      }
      OPTIONAL { ?call genex:hasExpressionLevel ?level . }
      OPTIONAL { ?call genex:expressionLevel ?level . }
      OPTIONAL { ?call genex:hasExpressionScore ?score . }
      OPTIONAL { ?call genex:expressionScore ?score . }
      OPTIONAL { ?call genex:hasExpressionValue ?score . }
      OPTIONAL { ?call genex:hasConfidenceLevel ?confidence . }
      OPTIONAL { ?call genex:hasQuality ?confidence . }
    }
    LIMIT 100
  `

  const callResults = await querySparql(callQuery)
  for (const binding of callResults) {
    pushUnique(out, seen, mapBinding(binding, safe))
    if (out.length >= 40) break
  }

  // Presence query (isExpressedIn) if calls empty or thin — anatomy only (no score)
  if (out.length < 8) {
    const presenceQuery = `
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
        FILTER(CONTAINS(STR(?anatEntity), "UBERON"))
      }
      LIMIT 80
    `
    const results = await querySparql(presenceQuery)
    for (const binding of results) {
      const row = mapBinding(binding, safe)
      // Presence-only path: explicit level when SPARQL did not return score/stage
      if (!row.expressionLevel || row.expressionLevel === 'present') {
        row.expressionLevel = 'present'
      }
      pushUnique(out, seen, row)
      if (out.length >= 40) break
    }
  }

  // Fallback: CL terms if still empty
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
      pushUnique(out, seen, mapBinding(binding, safe))
      if (out.length >= 30) break
    }
  }

  // Prefer higher score first when available
  out.sort((a, b) => (b.expressionScore || 0) - (a.expressionScore || 0))
  return out.slice(0, 40)
}

/**
 * Main export: Get Bgee expression data
 */
export async function getBgeeData(geneSymbol: string): Promise<{
  expressions: BgeeExpression[]
}> {
  const expressions = await getGeneExpression(geneSymbol)

  return {
    expressions: expressions.slice(0, 40),
  }
}

/** Deep link to Bgee gene page or anatomical entity. */
export function bgeeRecordUrl(expr: Pick<BgeeExpression, 'geneId' | 'geneSymbol' | 'anatomicalEntityId'>): string {
  if (expr.geneId && !expr.geneId.startsWith('http')) {
    // Prefer ensembl-style or symbol on Bgee gene page
    return `https://www.bgee.org/gene/${encodeURIComponent(expr.geneId)}`
  }
  if (expr.geneSymbol) {
    return `https://www.bgee.org/?page=gene&gene_id=${encodeURIComponent(expr.geneSymbol)}`
  }
  if (expr.anatomicalEntityId) {
    const id = expr.anatomicalEntityId.replace(':', '_')
    return `https://www.ebi.ac.uk/ols4/ontologies/uberon/terms?iri=http%3A%2F%2Fpurl.obolibrary.org%2Fobo%2F${encodeURIComponent(id)}`
  }
  return 'https://www.bgee.org/'
}
