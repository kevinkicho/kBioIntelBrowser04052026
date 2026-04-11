import type { UniprotEntry } from '../types'

const BASE_URL = 'https://rest.uniprot.org/uniprotkb/search'
const DETAIL_URL = 'https://rest.uniprot.org/uniprotkb'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface UniProtProtein {
  accession: string
  id: string
  proteinName: string
  geneName: string
  organism: string
  length: number
  sequence: string
  function?: string
  subcellularLocation?: string
  pathways?: string[]
  domains?: UniProtDomain[]
  variants?: UniProtVariant[]
}

export interface UniProtDomain {
  type: string
  start: number
  end: number
  description: string
}

export interface UniProtVariant {
  type: string
  start: number
  end: number
  sequence: string
  description: string
}

export interface UniProtSearchResponse {
  results: UniprotEntry[]
  pagination: {
    total: number
    size: number
    from: number
    next?: string
  }
}

export async function getUniprotEntriesByName(name: string): Promise<UniprotEntry[]> {
  try {
    const url = `${BASE_URL}?query=${encodeURIComponent(name)}&format=json&size=5`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((entry: {
      primaryAccession: string
      proteinDescription?: {
        recommendedName?: { fullName?: { value?: string } }
      }
      genes?: { geneName?: { value?: string } }[]
      organism?: { scientificName?: string }
      comments?: { commentType?: string; texts?: { value?: string }[] }[]
    }) => {
      const functionComment = entry.comments?.find(c => c.commentType === 'FUNCTION')
      return {
        accession: entry.primaryAccession ?? '',
        proteinName: entry.proteinDescription?.recommendedName?.fullName?.value ?? 'Unknown protein',
        geneName: entry.genes?.[0]?.geneName?.value ?? '',
        organism: entry.organism?.scientificName ?? 'Unknown',
        functionSummary: functionComment?.texts?.[0]?.value ?? '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Search UniProt with pagination support
 */
export async function searchUniProt(
  query: string,
  size = 20,
  from = 0,
): Promise<UniProtSearchResponse> {
  try {
    const params = new URLSearchParams({
      query,
      size: size.toString(),
      from: from.toString(),
      format: 'json',
    })
    const url = `${BASE_URL}?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('UniProt search failed')
    const data = await res.json()
    return {
      results: (data.results ?? []).map((entry: Record<string, unknown>) => ({
        accession: (entry.primaryAccession as string) ?? '',
        proteinName: (((entry.proteinDescription as Record<string, unknown>)?.recommendedName as Record<string, unknown>)?.fullName as Record<string, unknown>)?.value as string ?? 'Unknown protein',
        geneName: (((entry.genes as (Record<string, unknown>)[] | undefined)?.[0]?.geneName as Record<string, unknown>)?.value) as string ?? '',
        organism: ((entry.organism as Record<string, unknown>)?.scientificName as string) ?? 'Unknown',
        functionSummary: (((entry.comments as (Record<string, unknown>)[] | undefined)?.find((c) => (c.commentType as string) === 'FUNCTION') as Record<string, unknown>)?.texts as (Record<string, unknown>)[] | undefined)?.[0]?.value as string ?? '',
      })),
      pagination: {
        total: ((data.pagination as Record<string, unknown> | undefined)?.total as number) ?? 0,
        size: ((data.pagination as Record<string, unknown> | undefined)?.size as number) ?? size,
        from: ((data.pagination as Record<string, unknown> | undefined)?.from as number) ?? from,
        next: (data.pagination as Record<string, unknown> | undefined)?.next as string,
      },
    }
  } catch {
    return { results: [], pagination: { total: 0, size, from } }
  }
}

/**
 * Get full protein details by accession
 */
export async function getUniProtProtein(accession: string): Promise<UniProtProtein | null> {
  try {
    const url = `${DETAIL_URL}/${accession}.json`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return {
      accession: d.primaryAccession ?? '',
      id: d.uniProtkbId ?? '',
      proteinName: d.proteinDescription ?? '',
      geneName: d.genes?.[0]?.geneName?.value ?? '',
      organism: d.organism?.scientificName ?? '',
      length: d.sequence?.length ?? 0,
      sequence: d.sequence?.sequence ?? '',
      function: (d.comments as any[])?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value,
      subcellularLocation: (d.comments as any[])?.find((c: any) => c.commentType === 'SUBCELLULAR LOCATION')?.subcellularLocation?.value,
      pathways: (d.comments as any[])?.find((c: any) => c.commentType === 'PATHWAY')?.texts?.map((t: any) => t.value) ?? [],
      domains: (d.features as any[] ?? [])
        .filter((f: any) => ['DOMAIN', 'REGION', 'DNA_BIND', 'ZN_FING'].includes(f.type))
        .map((f: any) => ({
          type: f.type,
          start: f.location.start?.value ?? 0,
          end: f.location.end?.value ?? 0,
          description: f.description ?? f.type,
        })),
      variants: (d.features as any[] ?? [])
        .filter((f: any) => f.type === 'VARIANT')
        .map((f: any) => ({
          type: 'VARIANT',
          start: f.location.start?.value ?? 0,
          end: f.location.end?.value ?? 0,
          sequence: f.alternativeSequence ?? '',
          description: f.description ?? '',
        })),
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  } catch {
    return null
  }
}

/**
 * Get protein by gene symbol
 */
export async function getUniProtByGene(geneSymbol: string): Promise<UniProtProtein[]> {
  try {
    const searchResult = await searchUniProt(`gene:${geneSymbol} AND reviewed:true`, 10)
    const proteins = await Promise.all(
      searchResult.results.slice(0, 5).map((r) => getUniProtProtein(r.accession)),
    )
    return proteins.filter((p): p is UniProtProtein => p !== null)
  } catch {
    return []
  }
}

/**
 * Search by organism
 */
export async function searchUniProtByOrganism(organism: string, size = 20): Promise<UniProtSearchResponse> {
  return searchUniProt(`organism:"${organism}"`, size)
}
