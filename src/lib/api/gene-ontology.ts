// Gene Ontology (GO) API Client
// http://api.geneontology.org/
// Functional annotation standard for genes and gene products

const BASE_URL = 'http://api.geneontology.org/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface GOTerm {
  id: string
  label: string
  definition?: string
  aspect: 'biological_process' | 'molecular_function' | 'cellular_component'
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

/**
 * Search GO terms by keyword
 */
export async function searchGOTerms(query: string, limit = 20): Promise<GOSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      rows: limit.toString(),
      start: '0',
    })
    const url = `${BASE_URL}/ontology/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('GO search failed')
    const data = await res.json()

    return {
      terms: (data.docs ?? []).map((doc: Record<string, unknown>) => ({
        id: doc.id ?? '',
        label: doc.label ?? '',
        definition: doc.definition,
        aspect: doc.aspect ?? 'unknown',
        synonyms: doc.synonym ?? [],
        parents: doc.supers ?? [],
        children: doc.subs ?? [],
        xrefs: doc.xref ?? [],
      })),
      total: data.numFound ?? 0,
    }
  } catch {
    return { terms: [], total: 0 }
  }
}

/**
 * Get GO term details by ID
 */
export async function getGOTerm(goId: string): Promise<GOTerm | null> {
  try {
    const url = `${BASE_URL}/ontology/${encodeURIComponent(goId)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    return {
      id: data.id ?? '',
      label: data.label ?? '',
      definition: data.definition,
      aspect: data.aspect ?? 'unknown',
      synonyms: data.synonym ?? [],
      parents: data.supers ?? [],
      children: data.subs ?? [],
      xrefs: data.xref ?? [],
    }
  } catch {
    return null
  }
}

/**
 * Get GO annotations for a gene
 */
export async function getGOAnnotationsForGene(geneId: string): Promise<GOAnnotation[]> {
  try {
    const url = `${BASE_URL}/bioentity/gene/${encodeURIComponent(geneId)}/function`
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
 * Get GO term ancestors (parent hierarchy)
 */
export async function getGOTermAncestors(goId: string): Promise<GOTerm[]> {
  try {
    const url = `${BASE_URL}/ontology/${encodeURIComponent(goId)}/ancestors`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((term: Record<string, unknown>) => ({
      id: term.id ?? '',
      label: term.label ?? '',
      definition: term.definition,
      aspect: term.aspect ?? 'unknown',
      synonyms: term.synonym ?? [],
      parents: term.supers ?? [],
      children: term.subs ?? [],
      xrefs: term.xref ?? [],
    }))
  } catch {
    return []
  }
}

/**
 * Get GO term descendants (children hierarchy)
 */
export async function getGOTermDescendants(goId: string): Promise<GOTerm[]> {
  try {
    const url = `${BASE_URL}/ontology/${encodeURIComponent(goId)}/descendants`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((term: Record<string, unknown>) => ({
      id: term.id ?? '',
      label: term.label ?? '',
      definition: term.definition,
      aspect: term.aspect ?? 'unknown',
      synonyms: term.synonym ?? [],
      parents: term.supers ?? [],
      children: term.subs ?? [],
      xrefs: term.xref ?? [],
    }))
  } catch {
    return []
  }
}

/**
 * Enrichment analysis placeholder (requires gene list)
 */
export async function runGOEnrichment(geneIds: string[]): Promise<Record<string, unknown>> {
  // GO enrichment requires a gene list and background set
  // This would typically be done with external tools like g:Profiler, DAVID, or clusterProfiler
  // The GO API itself doesn't provide direct enrichment analysis
  return {
    message: 'GO enrichment analysis requires external tools (g:Profiler, DAVID, clusterProfiler)',
    geneCount: geneIds.length,
  }
}
