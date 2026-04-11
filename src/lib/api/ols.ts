// OLS - Ontology Lookup Service API Client
// https://www.ebi.ac.uk/ols4/api
// 270+ ontologies, 8-10M classes

const BASE_URL = 'https://www.ebi.ac.uk/ols4/api'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface OLSOntology {
  ontologyId: string
  name: string
  title: string
  description: string
  version: string
  url: string
}

export interface OLSTerm {
  id: string
  label: string
  iri: string
  ontologyId: string
  description?: string
  synonyms: string[]
  parents: string[]
  children: string[]
  ancestors: string[]
  descendants: string[]
  mappings: { source: string; url: string }[]
}

export interface OLSSearchResponse {
  terms: OLSTerm[]
  total: number
}

/**
 * Search across all ontologies
 */
export async function searchOLS(query: string, limit = 20): Promise<OLSSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      size: limit.toString(),
      start: '0',
    })
    const url = `${BASE_URL}/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('OLS search failed')
    const data = await res.json()

    return {
      terms: (data.embedded?.terms ?? []).map((term: Record<string, unknown>) => ({
        id: term.ontologyId ?? '',
        label: term.label ?? '',
        iri: term.iri ?? '',
        ontologyId: term.ontologyId ?? '',
        description: term.description ?? '',
        synonyms: term.synonym ?? [],
        parents: (term.parents as (Record<string, unknown>)[] | undefined)?.map((p) => p.id as string) ?? [],
        children: (term.children as (Record<string, unknown>)[] | undefined)?.map((c) => c.id as string) ?? [],
        ancestors: (term.ancestors as (Record<string, unknown>)[] | undefined)?.map((a) => a.id as string) ?? [],
        descendants: (term.descendants as (Record<string, unknown>)[] | undefined)?.map((d) => d.id as string) ?? [],
        mappings: (term.mappings as (Record<string, unknown>)[] | undefined)?.map((m) => ({
          source: (m.source as string) ?? '',
          url: (m.url as string) ?? '',
        })) ?? [],
      })),
      total: (data.page as Record<string, unknown> | undefined)?.totalElements as number ?? 0,
    }
  } catch {
    return { terms: [], total: 0 }
  }
}

/**
 * Get term by IRI
 */
export async function getOLSTermByIri(iri: string): Promise<OLSTerm | null> {
  try {
    const encodedIri = encodeURIComponent(iri)
    const url = `${BASE_URL}/entities?iri=${encodedIri}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    return {
      id: data.ontologyId ?? '',
      label: data.label ?? '',
      iri: data.iri ?? '',
      ontologyId: data.ontologyId ?? '',
      description: data.description ?? '',
      synonyms: data.synonym ?? [],
      parents: data.parents?.map((p: Record<string, unknown>) => (p.id as string)) ?? [],
      children: data.children?.map((c: Record<string, unknown>) => (c.id as string)) ?? [],
      ancestors: data.ancestors?.map((a: Record<string, unknown>) => (a.id as string)) ?? [],
      descendants: data.descendants?.map((d: Record<string, unknown>) => (d.id as string)) ?? [],
      mappings: (data.mappings ?? []).map((m: Record<string, unknown>) => ({
        source: (m.source as string) ?? '',
        url: (m.url as string) ?? '',
      })),
    }
  } catch {
    return null
  }
}

/**
 * Search within a specific ontology
 */
export async function searchOntology(
  ontologyId: string,
  query: string,
  limit = 20,
): Promise<OLSTerm[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      ontologyId,
      size: limit.toString(),
    })
    const url = `${BASE_URL}/search?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.embedded?.terms ?? []).map((term: Record<string, unknown>) => ({
      id: term.ontologyId ?? '',
      label: term.label ?? '',
      iri: term.iri ?? '',
      ontologyId: term.ontologyId ?? '',
      description: term.description ?? '',
      synonyms: term.synonym ?? [],
      parents: (term.parents as (Record<string, unknown>)[] | undefined)?.map((p) => (p.id as string)) ?? [],
      children: (term.children as (Record<string, unknown>)[] | undefined)?.map((c) => (c.id as string)) ?? [],
      ancestors: (term.ancestors as (Record<string, unknown>)[] | undefined)?.map((a) => (a.id as string)) ?? [],
      descendants: (term.descendants as (Record<string, unknown>)[] | undefined)?.map((d) => (d.id as string)) ?? [],
      mappings: (term.mappings as (Record<string, unknown>)[] | undefined)?.map((m) => ({
        source: (m.source as string) ?? '',
        url: (m.url as string) ?? '',
      })) ?? [],
    }))
  } catch {
    return []
  }
}

/**
 * List all available ontologies
 */
export async function listOLSOntologies(): Promise<OLSOntology[]> {
  try {
    const url = `${BASE_URL}/ontologies`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data._embedded?.ontologies ?? []).map((o: Record<string, unknown>) => {
      const links = o._links as Record<string, unknown> | undefined
      const self = links?.self as Record<string, unknown> | undefined
      return {
        ontologyId: (o.ontologyId as string) ?? '',
        name: (o.name as string) ?? '',
        title: (o.title as string) ?? '',
        description: (o.description as string) ?? '',
        version: (o.version as string) ?? '',
        url: (self?.href as string) ?? '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Get terms from a specific ontology
 */
export async function getOntologyTerms(ontologyId: string): Promise<OLSTerm[]> {
  try {
    const url = `${BASE_URL}/ontologies/${ontologyId}/terms`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data._embedded?.terms ?? []).map((term: Record<string, unknown>) => ({
      id: term.ontologyId ?? '',
      label: term.label ?? '',
      iri: term.iri ?? '',
      ontologyId: term.ontologyId ?? '',
      description: term.description ?? '',
      synonyms: term.synonym ?? [],
      parents: (term.parents as (Record<string, unknown>)[] | undefined)?.map((p) => (p.id as string)) ?? [],
      children: (term.children as (Record<string, unknown>)[] | undefined)?.map((c) => (c.id as string)) ?? [],
      ancestors: (term.ancestors as (Record<string, unknown>)[] | undefined)?.map((a) => (a.id as string)) ?? [],
      descendants: (term.descendants as (Record<string, unknown>)[] | undefined)?.map((d) => (d.id as string)) ?? [],
      mappings: (term.mappings as (Record<string, unknown>)[] | undefined)?.map((m) => ({
        source: (m.source as string) ?? '',
        url: (m.url as string) ?? '',
      })) ?? [],
    }))
  } catch {
    return []
  }
}
