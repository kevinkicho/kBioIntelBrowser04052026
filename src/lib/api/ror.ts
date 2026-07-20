/**
 * Research Organization Registry (ROR) — free CC0 org IDs for research institutions.
 * No API key. Rate limit ~2000 req / 5 min per IP.
 * @see https://ror.readme.io/docs/rest-api
 * @see docs/design/orgs-hospitals-compendium.md
 */

const BASE = 'https://api.ror.org/v2/organizations'
const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
  headers: { Accept: 'application/json' },
}

export type RorOrgType =
  | 'education'
  | 'healthcare'
  | 'facility'
  | 'company'
  | 'nonprofit'
  | 'government'
  | 'funder'
  | 'other'
  | string

export interface RorOrganization {
  rorId: string
  idUrl: string
  name: string
  aliases: string[]
  types: RorOrgType[]
  countryCode: string
  countryName: string
  city: string
  region: string
  website: string | null
  wikipedia: string | null
  established: number | null
  status: string
  /** How this row was discovered (query vs sponsor match) */
  matchSource?: string
}

function displayName(names: unknown): { name: string; aliases: string[] } {
  const list = Array.isArray(names) ? names : []
  let name = ''
  const aliases: string[] = []
  for (const n of list) {
    const row = n as { value?: string; types?: string[] | string; lang?: string }
    const value = String(row.value || '').trim()
    if (!value) continue
    const types = Array.isArray(row.types)
      ? row.types.map(String)
      : String(row.types || '')
          .split(/\s+/)
          .filter(Boolean)
    if (types.includes('ror_display') || (!name && types.includes('label'))) {
      if (!name) name = value
      else if (value !== name) aliases.push(value)
    } else if (types.includes('alias') || types.includes('acronym')) {
      aliases.push(value)
    } else if (!name) {
      name = value
    }
  }
  return { name: name || 'Unknown organization', aliases: aliases.slice(0, 8) }
}

function mapOrg(raw: unknown, matchSource?: string): RorOrganization | null {
  try {
    const o = raw as {
      id?: string
      status?: string
      types?: string[]
      established?: number | null
      names?: unknown
      links?: Array<{ type?: string; value?: string }>
      locations?: Array<{
        geonames_details?: {
          country_code?: string
          country_name?: string
          name?: string
          country_subdivision_name?: string
        }
      }>
    }
    const idUrl = String(o.id || '')
    if (!idUrl) return null
    const rorId = idUrl.replace(/^https?:\/\/ror\.org\//i, '')
    const { name, aliases } = displayName(o.names)
    const loc = o.locations?.[0]?.geonames_details
    const website =
      o.links?.find((l) => l.type === 'website')?.value ||
      o.links?.find((l) => l.value?.startsWith('http'))?.value ||
      null
    const wikipedia = o.links?.find((l) => l.type === 'wikipedia')?.value || null
    return {
      rorId,
      idUrl,
      name,
      aliases,
      types: Array.isArray(o.types) ? o.types.map(String) : [],
      countryCode: loc?.country_code || '',
      countryName: loc?.country_name || '',
      city: loc?.name || '',
      region: loc?.country_subdivision_name || '',
      website,
      wikipedia,
      established: typeof o.established === 'number' ? o.established : null,
      status: String(o.status || 'active'),
      matchSource,
    }
  } catch {
    return null
  }
}

/**
 * Full-text search ROR organizations (recommended for user-facing search).
 */
export async function searchRorOrganizations(
  query: string,
  opts?: { page?: number; countryCode?: string; types?: string[] },
): Promise<RorOrganization[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const page = Math.max(1, opts?.page ?? 1)
  const params = new URLSearchParams({
    query: q,
    page: String(page),
  })
  // ROR filter syntax: country.country_code:US,types:education
  const filters: string[] = []
  if (opts?.countryCode) {
    filters.push(`country.country_code:${opts.countryCode.toUpperCase()}`)
  }
  if (opts?.types?.length) {
    for (const t of opts.types) filters.push(`types:${t}`)
  }
  if (filters.length) params.set('filter', filters.join(','))

  try {
    const res = await fetch(`${BASE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { items?: unknown[] }
    return (data.items ?? [])
      .map((item) => mapOrg(item, 'query'))
      .filter((o): o is RorOrganization => o != null)
      .slice(0, 25)
  } catch {
    return []
  }
}

/**
 * Resolve a free-text org/sponsor name to the best ROR hit (first result).
 */
export async function resolveRorByName(name: string): Promise<RorOrganization | null> {
  const rows = await searchRorOrganizations(name)
  return rows[0] ?? null
}

/**
 * Resolve multiple org names (trial sponsors, grant institutes) with concurrency cap.
 */
export async function resolveRorByNames(
  names: string[],
  limit = 12,
): Promise<RorOrganization[]> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const n of names) {
    const t = n.trim()
    if (!t || t.length < 3) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    if (/^unknown$/i.test(t)) continue
    seen.add(key)
    unique.push(t)
    if (unique.length >= limit) break
  }

  const out: RorOrganization[] = []
  const byRor = new Set<string>()
  // Sequential small batches to respect rate limits
  for (const name of unique) {
    try {
      const hit = await resolveRorByName(name)
      if (hit && !byRor.has(hit.rorId)) {
        byRor.add(hit.rorId)
        out.push({ ...hit, matchSource: `sponsor:${name}` })
      }
    } catch {
      // skip
    }
  }
  return out
}

export function rorExploreUrl(rorId: string): string {
  const id = rorId.replace(/^https?:\/\/ror\.org\//i, '')
  return `https://ror.org/${id}`
}
