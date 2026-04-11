import type { PdbStructure } from '../types'

const SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPdbStructuresByName(name: string): Promise<PdbStructure[]> {
  try {
    // Step 1: Search for PDB entries containing the molecule
    const searchBody = JSON.stringify({
      query: {
        type: 'terminal',
        service: 'full_text',
        parameters: { value: name },
      },
      return_type: 'entry',
      request_options: {
        paginate: { start: 0, rows: 10 },
        sort: [{ sort_by: 'score', direction: 'desc' }],
      },
    })

    const searchRes = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: searchBody,
      ...fetchOptions,
    })
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()

    const pdbIds: string[] = (searchData.result_set ?? [])
      .map((r: { identifier?: string }) => r.identifier)
      .filter(Boolean)
    if (pdbIds.length === 0) return []

    // Step 2: Fetch summary data for all PDB IDs
    const idsParam = pdbIds.join(',')
    const summaryRes = await fetch(
      `https://data.rcsb.org/rest/v1/core/entry/${idsParam}`,
      fetchOptions,
    )

    // If batch endpoint fails, build from search results only
    if (!summaryRes.ok) {
      return pdbIds.map(id => ({
        pdbId: id,
        title: '',
        resolution: 0,
        method: '',
        depositionDate: '',
        releaseDate: '',
        organisms: [],
        chains: [],
        url: `https://www.rcsb.org/structure/${id}`,
      }))
    }

    const summaryData = await summaryRes.json()

    // summaryData may be a single object (1 ID) or keyed object (multiple IDs)
    const entries: Record<string, {
      struct?: { title?: string }
      rcsb_entry_info?: {
        resolution_combined?: number[]
        experimental_method?: string
      }
      rcsb_accession_info?: { deposit_date?: string }
    }> = pdbIds.length === 1
      ? { [pdbIds[0]]: summaryData }
      : summaryData

    const structures = pdbIds
      .map(id => {
        const entry = entries[id]
        if (!entry) return null
        const resolution = entry.rcsb_entry_info?.resolution_combined?.[0]
        const result: PdbStructure = {
          pdbId: id,
          title: entry.struct?.title ?? '',
          resolution: resolution != null ? Number(resolution) : 0,
          method: entry.rcsb_entry_info?.experimental_method ?? '',
          releaseDate: '',
          organisms: [],
          chains: [],
          depositionDate: entry.rcsb_accession_info?.deposit_date ?? '',
          url: `https://www.rcsb.org/structure/${id}`,
        }
        return result
      })
      .filter((s): s is PdbStructure => s !== null)

    // Sort by resolution (best/lowest first), 0 values last
    structures.sort((a, b) => {
      if (a.resolution === 0 && b.resolution === 0) return 0
      if (a.resolution === 0) return 1
      if (b.resolution === 0) return -1
      return a.resolution - b.resolution
    })

    return structures
  } catch {
    return []
  }
}
