import type { OMIMEntry } from '../types'

const BASE_URL = 'https://api.omim.org/api'
// OMIM requires API key - users can set via environment variable
const OMIM_API_KEY = process.env.OMIM_API_KEY ?? ''
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search OMIM for genetic disorders by name
 */
export async function searchOMIM(query: string): Promise<OMIMEntry[]> {
  if (!OMIM_API_KEY) {
    console.warn('OMIM API key not configured. Set OMIM_API_KEY environment variable.')
    return []
  }

  try {
    const url = `${BASE_URL}/entry/search?search=${encodeURIComponent(query)}&format=json&apikey=${OMIM_API_KEY}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    const entries = data.omim?.searchResponse?.entryList ?? []

    return entries.map((entry: Record<string, unknown>) => {
      const entryObj = entry.entry as Record<string, unknown> | undefined
      const titles = entryObj?.titles as string | undefined
      return {
        mimNumber: entry.mimNumber as number ?? 0,
        name: titles?.split(';;')?.[0] ?? '',
        prefix: entry.prefix as string ?? '',
        status: entry.status as string ?? '',
        description: '',
        geneSymbols: [],
        phenotypes: [],
        references: [],
        url: `https://omim.org/entry/${entry.mimNumber}`
      }
    })
  } catch {
    return []
  }
}

/**
 * Get OMIM entry details by MIM number
 */
export async function getOMIMEntry(mimNumber: number): Promise<OMIMEntry | null> {
  if (!OMIM_API_KEY) {
    return null
  }

  try {
    const url = `${BASE_URL}/entry?mimNumber=${mimNumber}&format=json&apikey=${OMIM_API_KEY}&include=all`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    const entry = data.omim?.entryList?.[0]?.entry
    if (!entry) return null

    // Extract gene symbols
    const geneSymbols = (entry.geneMap?.geneSymbols ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)

    // Extract phenotypes
    const phenotypes = (entry.phenotypeMapList ?? []).map((p: Record<string, unknown>) => ({
      mimNumber: p.phenotypeMimNumber as number ?? 0,
      name: p.phenotype as string ?? '',
      mapping: p.phenotypeMappingKey as string ?? ''
    }))

    // Extract references
    const references = (entry.referenceList ?? []).slice(0, 10).map((r: Record<string, unknown>) => ({
      pubmedId: r.pubmedID as number ?? 0,
      title: r.title as string ?? '',
      authors: r.authors as string ?? ''
    }))

    return {
      mimNumber: entry.mimNumber as number ?? mimNumber,
      name: entry.titles?.split(';;')?.[0] ?? '',
      prefix: entry.prefix as string ?? '',
      status: entry.status as string ?? '',
      description: (entry.text?.textSectionList?.[0]?.textSection?.content ?? '').substring(0, 500),
      geneSymbols,
      phenotypes,
      references,
      url: `https://omim.org/entry/${mimNumber}`
    }
  } catch {
    return null
  }
}

/**
 * Main export: Get OMIM data for a gene or disease name
 */
export async function getOMIMData(query: string): Promise<{
  entries: OMIMEntry[]
}> {
  const entries = await searchOMIM(query)

  return {
    entries: entries.slice(0, 10)
  }
}