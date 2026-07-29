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
  // Empty query = missing gene/accession (do not search free-text chemical names for gene APIs)
  if (!name?.trim()) return []
  try {
    const raw = name.trim()
    // Accession-style queries (P12345) use id: filter when possible
    const isAccession = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(raw)
    // Already a UniProt Lucene-style query
    const isFielded = /^(gene|gene_exact|accession|organism_id|id):/i.test(raw) || raw.includes(' AND ')
    let q: string
    if (isAccession) {
      q = `accession:${raw}`
    } else if (isFielded) {
      q = raw
    } else if (/^[A-Z][A-Z0-9-]{1,14}$/i.test(raw) && raw.length <= 12) {
      // Gene symbol → human reviewed first
      q = `(gene_exact:${raw} OR gene:${raw}) AND organism_id:9606`
    } else {
      q = raw
    }
    const url = `${BASE_URL}?query=${encodeURIComponent(q)}&format=json&size=5`
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
/**
 * UniProt REST returns nested name objects — never pass proteinDescription to React.
 * Shape: { recommendedName: { fullName: { value } }, alternativeNames?: [...] }
 */
export function extractUniProtProteinName(proteinDescription: unknown): string {
  if (!proteinDescription || typeof proteinDescription !== 'object') {
    return typeof proteinDescription === 'string' && proteinDescription.trim()
      ? proteinDescription.trim()
      : 'Unknown protein'
  }
  const pd = proteinDescription as {
    recommendedName?: { fullName?: { value?: string }; shortNames?: { value?: string }[] }
    alternativeNames?: { fullName?: { value?: string } }[]
    submissionNames?: { fullName?: { value?: string } }[]
  }
  const rec =
    pd.recommendedName?.fullName?.value?.trim() ||
    pd.recommendedName?.shortNames?.[0]?.value?.trim()
  if (rec) return rec
  const alt = pd.alternativeNames?.[0]?.fullName?.value?.trim()
  if (alt) return alt
  const sub = pd.submissionNames?.[0]?.fullName?.value?.trim()
  if (sub) return sub
  return 'Unknown protein'
}

function extractAlternativeSequence(alt: unknown): string {
  if (alt == null) return ''
  if (typeof alt === 'string') return alt
  if (typeof alt !== 'object') return String(alt)
  const a = alt as {
    originalSequence?: string
    alternativeSequences?: string[]
  }
  const orig = a.originalSequence?.trim() ?? ''
  const next = a.alternativeSequences?.[0]?.trim() ?? ''
  if (orig && next) return `${orig}→${next}`
  return next || orig || ''
}

function extractSubcellularLocation(comments: unknown): string | undefined {
  if (!Array.isArray(comments)) return undefined
  const c = comments.find(
    (x: { commentType?: string }) => x?.commentType === 'SUBCELLULAR LOCATION',
  ) as
    | {
        subcellularLocations?: { location?: { value?: string } }[]
        subcellularLocation?: { value?: string }
        texts?: { value?: string }[]
      }
    | undefined
  if (!c) return undefined
  const fromList = c.subcellularLocations?.[0]?.location?.value?.trim()
  if (fromList) return fromList
  if (typeof c.subcellularLocation?.value === 'string') return c.subcellularLocation.value
  const text = c.texts?.[0]?.value?.trim()
  return text || undefined
}

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
      proteinName: extractUniProtProteinName(d.proteinDescription),
      geneName: d.genes?.[0]?.geneName?.value ?? '',
      organism: d.organism?.scientificName ?? '',
      length: d.sequence?.length ?? 0,
      sequence: typeof d.sequence?.sequence === 'string' ? d.sequence.sequence : '',
      function: (d.comments as any[])?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value,
      subcellularLocation: extractSubcellularLocation(d.comments),
      pathways: (d.comments as any[])?.find((c: any) => c.commentType === 'PATHWAY')?.texts?.map((t: any) => t.value) ?? [],
      domains: (d.features as any[] ?? [])
        .filter((f: any) => ['DOMAIN', 'REGION', 'DNA_BIND', 'ZN_FING'].includes(f.type))
        .map((f: any) => ({
          type: f.type,
          start: f.location?.start?.value ?? 0,
          end: f.location?.end?.value ?? 0,
          description: typeof f.description === 'string' ? f.description : f.type,
        })),
      variants: (d.features as any[] ?? [])
        .filter((f: any) => f.type === 'VARIANT')
        .map((f: any) => ({
          type: 'VARIANT',
          start: f.location?.start?.value ?? 0,
          end: f.location?.end?.value ?? 0,
          sequence: extractAlternativeSequence(f.alternativeSequence),
          description: typeof f.description === 'string' ? f.description : '',
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
