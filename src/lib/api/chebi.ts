import type { ChebiAnnotation } from '../types'
import { stripHtml } from '../utils'

const OLS_SEARCH_BASE = 'https://www.ebi.ac.uk/ols4/api/search'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

interface OlsDoc {
  id?: string
  short_form?: string
  label?: string
  description?: string[]
  annotation?: {
    has_role?: string[]
    [key: string]: unknown
  }
}

function shortFormToChebiId(shortForm: string): string {
  // Convert "CHEBI_71072" -> "CHEBI:71072"
  return shortForm.replace('_', ':')
}

function mapOlsDoc(doc: OlsDoc, fallbackName: string): ChebiAnnotation | null {
  const shortForm = doc.short_form ?? ''
  if (!shortForm) return null
  const chebiId = shortFormToChebiId(shortForm)
  const roles: string[] = doc.annotation?.has_role ?? []
  const definition = doc.description?.[0] ?? ''
  return {
    chebiId,
    name: doc.label ?? fallbackName,
    definition: stripHtml(definition),
    roles,
    url: `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${encodeURIComponent(chebiId)}`,
  }
}

/**
 * Identity-first: prefer exact CHEBI id / IRI, then fielded label, then free-text OLS.
 */
export async function getChebiAnnotationByName(name: string): Promise<ChebiAnnotation | null> {
  try {
    const q = (name || '').trim()
    if (!q) return null

    // 1) Direct CHEBI id (CHEBI:15365 or 15365)
    const idMatch = q.match(/^(?:CHEBI[:_])?(\d+)$/i)
    if (idMatch) {
      const iri = `http://purl.obolibrary.org/obo/CHEBI_${idMatch[1]}`
      const exactUrl =
        `${OLS_SEARCH_BASE}?q=${encodeURIComponent(iri)}&ontology=chebi&exact=true&rows=1` +
        `&queryFields=iri`
      const exactRes = await fetch(exactUrl, fetchOptions)
      if (exactRes.ok) {
        const exactData = await exactRes.json()
        const doc = (exactData?.response?.docs as OlsDoc[] | undefined)?.[0]
        if (doc) {
          const mapped = mapOlsDoc(doc, q)
          if (mapped) return mapped
        }
      }
      // Fallback: term endpoint-style short form search
      const sfUrl = `${OLS_SEARCH_BASE}?q=CHEBI_${idMatch[1]}&ontology=chebi&exact=true&rows=1`
      const sfRes = await fetch(sfUrl, fetchOptions)
      if (sfRes.ok) {
        const sfData = await sfRes.json()
        const doc = (sfData?.response?.docs as OlsDoc[] | undefined)?.[0]
        const mapped = doc ? mapOlsDoc(doc, q) : null
        if (mapped) return mapped
      }
    }

    // 2) Exact label match
    const labelUrl =
      `${OLS_SEARCH_BASE}?q=${encodeURIComponent(q)}&ontology=chebi&exact=true&rows=3` +
      `&queryFields=label`
    const labelRes = await fetch(labelUrl, fetchOptions)
    if (labelRes.ok) {
      const labelData = await labelRes.json()
      const docs: OlsDoc[] = labelData?.response?.docs ?? []
      const preferred =
        docs.find((d) => (d.label || '').toLowerCase() === q.toLowerCase()) || docs[0]
      if (preferred) {
        const mapped = mapOlsDoc(preferred, q)
        if (mapped) return mapped
      }
    }

    // 3) Free-text fallback
    const searchUrl = `${OLS_SEARCH_BASE}?q=${encodeURIComponent(q)}&ontology=chebi&rows=1`
    const res = await fetch(searchUrl, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()
    const docs: OlsDoc[] = data?.response?.docs ?? []
    if (!docs.length) return null
    return mapOlsDoc(docs[0], q)
  } catch {
    return null
  }
}
