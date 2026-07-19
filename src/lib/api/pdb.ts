import type { PdbStructure } from '../types'
import { pdbStructureDeepLink } from '../pdbLinks'

const SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query'
const ENTRY_URL = 'https://data.rcsb.org/rest/v1/core/entry'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

function firstCitation(entry: Record<string, unknown>): Record<string, unknown> | null {
  const primary = entry.rcsb_primary_citation as Record<string, unknown> | undefined
  if (primary) return primary
  const citations = entry.citation as Record<string, unknown>[] | undefined
  if (Array.isArray(citations) && citations.length > 0) {
    const p = citations.find((c) => c.rcsb_is_primary === 'Y' || c.id === 'primary')
    return p || citations[0]
  }
  return null
}

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

          const info = entry?.rcsb_entry_info ?? {}
          const rawResolution = info.resolution_combined
          const resolution = Array.isArray(rawResolution)
            ? Number(rawResolution[0]) || 0
            : typeof rawResolution === 'number'
              ? rawResolution
              : 0

          const rawMethod = info.experimental_method ?? entry?.exptl?.[0]?.method ?? ''
          const method = Array.isArray(rawMethod) ? rawMethod.join(', ') : String(rawMethod)

          const deposit = entry?.rcsb_accession_info?.deposit_date
            ? String(entry.rcsb_accession_info.deposit_date).split('T')[0]
            : ''
          const release = entry?.rcsb_accession_info?.initial_release_date
            ? String(entry.rcsb_accession_info.initial_release_date).split('T')[0]
            : ''

          const spaceGroup =
            entry?.symmetry?.space_group_name_H_M ||
            entry?.symmetry?.['space_group_name_H-M'] ||
            ''

          const polymerTypes = info.selected_polymer_entity_types
            ? String(info.selected_polymer_entity_types)
            : ''

          const mw =
            typeof info.molecular_weight === 'number' && info.molecular_weight > 0
              ? info.molecular_weight
              : undefined

          const cit = firstCitation(entry as Record<string, unknown>)
          const citationDoi = cit?.pdbx_database_id_DOI
            ? String(cit.pdbx_database_id_DOI)
            : undefined
          const citationPmid =
            cit?.pdbx_database_id_PubMed != null
              ? cit.pdbx_database_id_PubMed
              : entry?.rcsb_entry_container_identifiers?.pubmed_id

          const keywords =
            entry?.struct_keywords?.pdbx_keywords ||
            entry?.struct_keywords?.text ||
            ''

          const url = pdbStructureDeepLink({ pdbId: id })

          return {
            pdbId: id,
            title: entry?.struct?.title ?? '',
            resolution,
            method,
            depositionDate: deposit,
            releaseDate: release,
            organisms: [],
            chains: [],
            url,
            spaceGroup: spaceGroup || undefined,
            polymerTypes: polymerTypes || undefined,
            molecularWeightKda: mw,
            citationDoi,
            citationPmid,
            keywords: keywords ? String(keywords) : undefined,
          } satisfies PdbStructure
        } catch {
          return null
        }
      }),
    )

    const structures: PdbStructure[] = []
    for (const s of results) {
      if (s) structures.push(s)
    }

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
