/**
 * OpenAIRE Graph Search API — free public research projects (incl. EC/CORDIS, NIH, NSF, …).
 * No API key. NSF/EU-funding context for molecule/disease terms.
 * @see https://graph.openaire.eu/docs/apis/search-api/projects/
 * @see docs/design/public-apis-international.md
 */

export interface OpenAireProject {
  id: string
  code: string
  title: string
  acronym: string
  startDate: string
  endDate: string
  funderShort: string
  funderName: string
  jurisdiction: string
  fundedAmount: number
  totalCost: number
  /** OpenAIRE explore deep link */
  url: string
  /** CORDIS deep link when EC grant code looks like H2020/FP7 style */
  cordisUrl: string | null
}

const PROJECTS_BASE = 'https://api.openaire.eu/search/projects'
const PUBLICATIONS_BASE = 'https://api.openaire.eu/search/publications'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface OpenAirePublication {
  id: string
  title: string
  doi: string | null
  year: string
  publisher: string
  /** Best public landing page (DOI or OpenAIRE explore) */
  url: string
}

/** OpenAIRE wraps many scalars as { "$": "value" } */
function unwrap(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }
  if (typeof v === 'object' && v !== null && '$' in v) {
    return unwrap((v as { $: unknown }).$)
  }
  return ''
}

function num(v: unknown): number {
  const n = Number(unwrap(v))
  return Number.isFinite(n) ? n : 0
}

function asResultArray(results: unknown): unknown[] {
  if (!results || typeof results !== 'object') return []
  const r = (results as { result?: unknown }).result
  if (!r) return []
  return Array.isArray(r) ? r : [r]
}

function cordisUrlForCode(code: string, funderShort: string): string | null {
  const c = code.trim()
  if (!c) return null
  // EC project codes often numeric or contain H2020 / Horizon
  if (
    /EC|CORDIS|H2020|HORIZON|FP7|HE/i.test(funderShort) ||
    /^\d{6,}$/.test(c) ||
    /H2020|HORIZON|FP7/i.test(c)
  ) {
    return `https://cordis.europa.eu/project/id/${encodeURIComponent(c)}`
  }
  return null
}

function openaireExploreUrl(id: string, code: string): string {
  if (id) {
    return `https://explore.openaire.eu/search/project?projectId=${encodeURIComponent(id)}`
  }
  if (code) {
    return `https://explore.openaire.eu/search/find?keyword=${encodeURIComponent(code)}`
  }
  return 'https://explore.openaire.eu/'
}

function mapProject(raw: unknown): OpenAireProject | null {
  try {
    const meta = (raw as { metadata?: { 'oaf:entity'?: { 'oaf:project'?: Record<string, unknown> } } })
      ?.metadata?.['oaf:entity']?.['oaf:project']
    if (!meta) return null
    const code = unwrap(meta.code)
    const title = unwrap(meta.title)
    if (!code && !title) return null
    const fundingtree = meta.fundingtree as Record<string, unknown> | undefined
    const funder = (fundingtree?.funder ?? {}) as Record<string, unknown>
    const funderShort = unwrap(funder.shortname) || unwrap(funder.name)
    const funderName = unwrap(funder.name) || funderShort
    const jurisdiction = unwrap(funder.jurisdiction)
    const header = (raw as { header?: { 'dri:objIdentifier'?: unknown } })?.header
    const id = unwrap(header?.['dri:objIdentifier']) || code

    return {
      id,
      code,
      title,
      acronym: unwrap(meta.acronym),
      startDate: unwrap(meta.startdate),
      endDate: unwrap(meta.enddate),
      funderShort,
      funderName,
      jurisdiction,
      fundedAmount: num(meta.fundedamount),
      totalCost: num(meta.totalcost),
      url: openaireExploreUrl(id, code),
      cordisUrl: cordisUrlForCode(code, funderShort),
    }
  } catch {
    return null
  }
}

/**
 * Search OpenAIRE projects by name/keywords (includes EC and other funders).
 */
export async function getOpenAireProjectsByName(
  query: string,
  opts?: { size?: number; hasECFunding?: boolean },
): Promise<OpenAireProject[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const size = Math.min(25, Math.max(1, opts?.size ?? 12))
  const params = new URLSearchParams({
    name: q,
    format: 'json',
    size: String(size),
    page: '1',
  })
  if (opts?.hasECFunding) params.set('hasECFunding', 'true')

  try {
    const res = await fetch(`${PROJECTS_BASE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as {
      response?: { results?: unknown }
    }
    const rows = asResultArray(data.response?.results)
    return rows
      .map(mapProject)
      .filter((p): p is OpenAireProject => p != null)
      .slice(0, size)
  } catch {
    return []
  }
}

/** Prefer EC-funded projects when available; fall back to general search. */
export async function getEuResearchProjectsByName(query: string): Promise<OpenAireProject[]> {
  const ec = await getOpenAireProjectsByName(query, { size: 12, hasECFunding: true })
  if (ec.length > 0) return ec
  return getOpenAireProjectsByName(query, { size: 12 })
}

function mapPublication(raw: unknown): OpenAirePublication | null {
  try {
    const meta = (raw as { metadata?: { 'oaf:entity'?: { 'oaf:result'?: Record<string, unknown> } } })
      ?.metadata?.['oaf:entity']?.['oaf:result']
    if (!meta) return null
    const header = (raw as { header?: { 'dri:objIdentifier'?: unknown } })?.header
    const id = unwrap(header?.['dri:objIdentifier'])

    // title can be array of { $, @classid }
    let title = ''
    const titles = meta.title
    if (Array.isArray(titles)) {
      const main =
        titles.find((t) => String((t as { '@classid'?: string })['@classid'] || '').includes('main')) ||
        titles[0]
      title = unwrap(main)
    } else {
      title = unwrap(titles)
    }

    let doi: string | null = null
    const pid = meta.pid
    if (Array.isArray(pid)) {
      for (const p of pid) {
        const classid = String((p as { '@classid'?: string })['@classid'] || '').toLowerCase()
        if (classid === 'doi') {
          doi = unwrap(p)
          break
        }
      }
    } else if (pid && typeof pid === 'object') {
      const classid = String((pid as { '@classid'?: string })['@classid'] || '').toLowerCase()
      if (classid === 'doi') doi = unwrap(pid)
    }
    if (doi) {
      doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '')
    }

    const year = unwrap(meta.dateofacceptance) || ''
    // date often YYYY-MM-DD
    const yearOnly = year.match(/\d{4}/)?.[0] || year.slice(0, 4)
    const publisher = unwrap(meta.publisher)

    if (!title && !doi) return null
    const url = doi
      ? `https://doi.org/${doi}`
      : id
        ? `https://explore.openaire.eu/search/publication?articleId=${encodeURIComponent(id)}`
        : `https://explore.openaire.eu/search/find?keyword=${encodeURIComponent(title)}`

    return {
      id: id || doi || title.slice(0, 40),
      title: title || doi || 'Untitled',
      doi,
      year: yearOnly,
      publisher,
      url,
    }
  } catch {
    return null
  }
}

/**
 * Search OpenAIRE research products (publications) by keywords.
 */
export async function getOpenAirePublicationsByName(
  query: string,
  size = 12,
): Promise<OpenAirePublication[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const params = new URLSearchParams({
    keywords: q,
    format: 'json',
    size: String(Math.min(25, Math.max(1, size))),
    page: '1',
  })
  try {
    const res = await fetch(`${PUBLICATIONS_BASE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { response?: { results?: unknown } }
    const rows = asResultArray(data.response?.results)
    return rows
      .map(mapPublication)
      .filter((p): p is OpenAirePublication => p != null)
      .slice(0, size)
  } catch {
    return []
  }
}
