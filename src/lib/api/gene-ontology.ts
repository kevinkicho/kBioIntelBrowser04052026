// Gene Ontology (GO) API Client
// Uses EBI QuickGO API for term search
// http://api.geneontology.org/ used for bioentity queries (annotations)

const QUICKGO_URL = 'https://www.ebi.ac.uk/QuickGO/services/ontology/go'
const GO_API_URL = 'https://api.geneontology.org/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface GOTerm {
  id: string
  label: string
  definition?: string
  aspect: string
  synonyms: string[]
  parents: string[]
  children: string[]
  xrefs: string[]
}

export interface GOAnnotation {
  geneId: string
  geneSymbol: string
  goId: string
  goLabel: string
  aspect: string
  evidence: string
  reference: string
  withFrom: string
}

export interface GOSearchResponse {
  terms: GOTerm[]
  total: number
}

function mapAspect(letter: string): 'biological_process' | 'molecular_function' | 'cellular_component' | 'unknown' {
  if (letter === 'P' || letter === 'F' || letter === 'C') {
    return letter === 'P' ? 'biological_process' : letter === 'F' ? 'molecular_function' : 'cellular_component'
  }
  const lower = (letter || '').toLowerCase()
  if (lower.includes('biological') || lower.includes('process')) return 'biological_process'
  if (lower.includes('molecular') || lower.includes('function')) return 'molecular_function'
  if (lower.includes('cellular') || lower.includes('component')) return 'cellular_component'
  return 'unknown'
}

/**
 * Search GO terms by keyword using QuickGO API
 */
export async function searchGOTerms(query: string, limit = 20): Promise<GOSearchResponse> {
  try {
    const params = new URLSearchParams({
      query: query,
      page: '1',
      limit: limit.toString(),
    })
    const url = `${QUICKGO_URL}/search?${params}`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { terms: [], total: 0 }
    }
    const data = await res.json()

    return {
      terms: (data.results ?? []).map((doc: Record<string, unknown>) => ({
        id: doc.id ?? '',
        label: doc.name ?? '',
        definition: typeof doc.definition === 'object' && doc.definition ? (doc.definition as Record<string, unknown>).text as string : (doc.definition as string ?? ''),
        aspect: mapAspect(doc.aspect as string ?? 'unknown'),
        synonyms: Array.isArray(doc.synonyms) ? doc.synonyms.map(String) : [],
        parents: [],
        children: [],
        xrefs: [],
      })),
      total: data.numberOfHits ?? (data.results ?? []).length,
    }
  } catch {
    return { terms: [], total: 0 }
  }
}

/**
 * Get GO term details by ID using QuickGO API
 */
export async function getGOTerm(goId: string): Promise<GOTerm | null> {
  try {
    const url = `${QUICKGO_URL}/terms/${encodeURIComponent(goId)}`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const results: Record<string, unknown>[] = data.results ?? []
    const term = results[0]
    if (!term) return null
    return {
      id: (term.id as string) ?? goId,
      label: (term.name as string) ?? '',
      definition: typeof term.definition === 'object' ? String((term.definition as Record<string, unknown>)?.text ?? '') : String(term.definition ?? ''),
      aspect: String(term.aspect ?? ''),
      synonyms: Array.isArray(term.synonyms) ? term.synonyms.map(String) : [],
      parents: [],
      children: [],
      xrefs: Array.isArray(term.xrefs) ? term.xrefs.map(String) : [],
    }
  } catch {
    return null
  }
}

/**
 * Get GO annotations for a gene using GO API
 */
export async function getGOAnnotationsForGene(geneId: string): Promise<GOAnnotation[]> {
  try {
    const url = `${GO_API_URL}/bioentity/gene/${encodeURIComponent(geneId)}/function`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((ann: Record<string, unknown>) => {
      const annotation = ann.annotation as Record<string, unknown> | undefined
      const annotationObj = annotation?.object as Record<string, unknown> | undefined
      const evidence = ann.evidence as Record<string, unknown> | undefined
      return {
        geneId: (ann.gene as string) ?? '',
        geneSymbol: (ann.gene_label as string) ?? '',
        goId: (annotationObj?.id as string) ?? '',
        goLabel: (annotationObj?.label as string) ?? '',
        aspect: (ann.aspect as string) ?? '',
        evidence: (evidence?.type as string) ?? '',
        reference: (evidence?.with_from as string) ?? '',
        withFrom: (evidence?.with_from as string) ?? '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Get GO term ancestors (parent hierarchy) using QuickGO API
 */
export async function getGOTermAncestors(goId: string): Promise<GOTerm[]> {
  try {
    const url = `${QUICKGO_URL}/terms/${encodeURIComponent(goId)}/ancestors`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.results ?? []) as Record<string, unknown>[]).map((term) => ({
      id: String(term.id ?? ''),
      label: String(term.name ?? ''),
      definition: typeof term.definition === 'object' ? String((term.definition as Record<string, unknown>)?.text ?? '') : String(term.definition ?? ''),
      aspect: String(term.aspect ?? ''),
      synonyms: Array.isArray(term.synonyms) ? (term.synonyms as unknown[]).map(String) : [],
      parents: [],
      children: [],
      xrefs: [],
    }))
  } catch {
    return []
  }
}

export async function getGOTermDescendants(goId: string): Promise<GOTerm[]> {
  try {
    const url = `${QUICKGO_URL}/terms/${encodeURIComponent(goId)}/descendants`
    const res = await fetch(url, {
      ...fetchOptions,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.results ?? []) as Record<string, unknown>[]).map((term) => ({
      id: String(term.id ?? ''),
      label: String(term.name ?? ''),
      definition: typeof term.definition === 'object' ? String((term.definition as Record<string, unknown>)?.text ?? '') : String(term.definition ?? ''),
      aspect: String(term.aspect ?? ''),
      synonyms: Array.isArray(term.synonyms) ? (term.synonyms as unknown[]).map(String) : [],
      parents: [],
      children: [],
      xrefs: [],
    }))
  } catch {
    return []
  }
}

/**
 * Enrichment analysis placeholder (requires gene list)
 */
export async function runGOEnrichment(geneIds: string[]): Promise<Record<string, unknown>> {
  return {
    message: 'GO enrichment analysis requires external tools (g:Profiler, DAVID, clusterProfiler)',
    geneCount: geneIds.length,
  }
}
