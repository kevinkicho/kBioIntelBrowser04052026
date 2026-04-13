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

export async function getChebiAnnotationByName(name: string): Promise<ChebiAnnotation | null> {
  try {
    const searchUrl = `${OLS_SEARCH_BASE}?q=${encodeURIComponent(name)}&ontology=chebi&rows=1`
    const res = await fetch(searchUrl, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const docs: OlsDoc[] = data?.response?.docs ?? []
    if (!docs.length) return null

    const doc = docs[0]
    const shortForm = doc.short_form ?? ''
    if (!shortForm) return null

    const chebiId = shortFormToChebiId(shortForm)
    const roles: string[] = doc.annotation?.has_role ?? []

    const definition = doc.description?.[0] ?? ''
    const cleanDefinition = stripHtml(definition)

    return {
      chebiId,
      name: doc.label ?? name,
      definition: cleanDefinition,
      roles,
      url: `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=${chebiId}`,
    }
  } catch {
    return null
  }
}
