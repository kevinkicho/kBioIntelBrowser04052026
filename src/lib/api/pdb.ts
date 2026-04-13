import type { PdbStructure } from '../types'

const SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query'
const ENTRY_URL = 'https://data.rcsb.org/rest/v1/core/entry'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPdbStructuresByName(name: string): Promise<PdbStructure[]> {
  try {
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

    const results = await Promise.all(
      pdbIds.map(async (id) => {
        try {
          const res = await fetch(`${ENTRY_URL}/${id}`, fetchOptions)
          if (!res.ok) return null
          const entry = await res.json()

          const rawResolution = entry?.rcsb_entry_info?.resolution_combined
          const resolution = Array.isArray(rawResolution)
            ? Number(rawResolution[0]) || 0
            : typeof rawResolution === 'number'
              ? rawResolution
              : 0

          const rawMethod = entry?.rcsb_entry_info?.experimental_method ?? ''
          const method = Array.isArray(rawMethod) ? rawMethod.join(', ') : String(rawMethod)

          return {
            pdbId: id,
            title: entry?.struct?.title ?? '',
            resolution: resolution,
            method,
            depositionDate: entry?.rcsb_accession_info?.deposit_date
              ? String(entry.rcsb_accession_info.deposit_date).split('T')[0]
              : '',
            releaseDate: '',
            organisms: [],
            chains: [],
            url: `https://www.rcsb.org/structure/${id}`,
          } as PdbStructure
        } catch {
          return null
        }
      })
    )

    const structures = results.filter((s): s is PdbStructure => s !== null)

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