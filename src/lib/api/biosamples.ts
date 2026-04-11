// EMBL-EBI BioSamples API Client
// https://www.ebi.ac.uk/biosamples/
// 2M+ biological sample metadata with links to experimental data

const BASE_URL = 'https://www.ebi.ac.uk/biosamples/api/samples'

const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
}

export interface BioSample {
  id: string
  name: string
  domain: string
  organism: string
  description?: string
  submitter: string
  submissionDate: string
  updateDate: string
  attributes: Attribute[]
  externalReferences: ExternalReference[]
  publications: Publication[]
  links: Link[]
}

export interface Attribute {
  name: string
  value: string
  unit?: string
  surface?: string
}

export interface ExternalReference {
  url: string
  label: string
}

export interface Publication {
  pmid?: string
  doi?: string
}

export interface Link {
  url: string
  type: string
}

export interface BioSamplesSearchResponse {
  samples: BioSample[]
  total: number
  page: number
  size: number
}

/**
 * Search BioSamples by keyword
 */
export async function searchBioSamples(
  query: string,
  page = 0,
  size = 20,
): Promise<BioSamplesSearchResponse> {
  try {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      size: size.toString(),
    })
    const url = `${BASE_URL}?${params}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) throw new Error('BioSamples search failed')
    const data = await res.json()

    return {
      samples: (data._embedded?.sample ?? []).map((sample: Record<string, unknown>) => ({
        id: (sample.id as string) ?? '',
        name: (sample.name as string) ?? '',
        domain: (sample.domain as string) ?? '',
        organism: ((sample.characteristics as Record<string, unknown> | undefined)?.organism as string) ?? '',
        description: (sample.description as string) ?? '',
        submitter: (sample.submitter as string) ?? '',
        submissionDate: (sample.updateDate as string) ?? '',
        updateDate: (sample.updateDate as string) ?? '',
        attributes: ((sample.characteristics as Record<string, unknown> | undefined)?.attributes as (Record<string, unknown>)[] | undefined)?.map((attr: Record<string, unknown>) => ({
          name: (attr.name as string) ?? '',
          value: (attr.value as string) ?? '',
          unit: (attr.unit as string) ?? undefined,
          surface: (attr.surface as string) ?? undefined,
        })) ?? [],
        externalReferences: ((sample.externalReferences as (Record<string, unknown>)[] | undefined) ?? []).map((ref: Record<string, unknown>) => ({
          url: (ref.url as string) ?? '',
          label: (ref.label as string) ?? '',
        })),
        publications: ((sample.publications as (Record<string, unknown>)[] | undefined) ?? []).map((pub: Record<string, unknown>) => ({
          pmid: (pub.pmid as string) ?? undefined,
          doi: (pub.doi as string) ?? undefined,
        })),
        links: ((sample.links as (Record<string, unknown>)[] | undefined) ?? []).map((link: Record<string, unknown>) => ({
          url: (link.href as string) ?? '',
          type: (link.type as string) ?? '',
        })),
      })),
      total: (data.page as Record<string, unknown> | undefined)?.totalElements as number ?? 0,
      page: (data.page as Record<string, unknown> | undefined)?.number as number ?? page,
      size: (data.page as Record<string, unknown> | undefined)?.size as number ?? size,
    }
  } catch {
    return { samples: [], total: 0, page, size }
  }
}

/**
 * Get BioSample by ID
 */
export async function getBioSample(id: string): Promise<BioSample | null> {
  try {
    const encodedId = encodeURIComponent(id)
    const url = `${BASE_URL}/${encodedId}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const data = await res.json()

    return {
      id: (data.id as string) ?? '',
      name: (data.name as string) ?? '',
      domain: (data.domain as string) ?? '',
      organism: ((data.characteristics as Record<string, unknown> | undefined)?.organism as string) ?? '',
      description: (data.description as string) ?? '',
      submitter: (data.submitter as string) ?? '',
      submissionDate: (data.updateDate as string) ?? '',
      updateDate: (data.updateDate as string) ?? '',
      attributes: ((data.characteristics as Record<string, unknown> | undefined)?.attributes as (Record<string, unknown>)[] | undefined)?.map((attr: Record<string, unknown>) => ({
        name: (attr.name as string) ?? '',
        value: (attr.value as string) ?? '',
        unit: (attr.unit as string) ?? undefined,
        surface: (attr.surface as string) ?? undefined,
      })) ?? [],
      externalReferences: ((data.externalReferences as (Record<string, unknown>)[] | undefined) ?? []).map((ref: Record<string, unknown>) => ({
        url: (ref.url as string) ?? '',
        label: (ref.label as string) ?? '',
      })),
      publications: ((data.publications as (Record<string, unknown>)[] | undefined) ?? []).map((pub: Record<string, unknown>) => ({
        pmid: (pub.pmid as string) ?? undefined,
        doi: (pub.doi as string) ?? undefined,
      })),
      links: ((data.links as (Record<string, unknown>)[] | undefined) ?? []).map((link: Record<string, unknown>) => ({
        url: (link.href as string) ?? '',
        type: (link.type as string) ?? '',
      })),
    }
  } catch {
    return null
  }
}

/**
 * Get samples by organism
 */
export async function getSamplesByOrganism(organism: string, size = 20): Promise<BioSamplesSearchResponse> {
  return searchBioSamples(`organism:"${organism}"`, 0, size)
}

/**
 * Get samples by submitter
 */
export async function getSamplesBySubmitter(submitter: string, size = 20): Promise<BioSamplesSearchResponse> {
  return searchBioSamples(`submitter:"${submitter}"`, 0, size)
}
