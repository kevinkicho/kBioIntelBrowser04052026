/**
 * OpenAlex institutions — free, no API key. Name search for US colleges/universities.
 * Used as Scorecard DEMO_KEY fallback (rate limits / key issues).
 * @see https://docs.openalex.org/api-entities/institutions
 */

const BASE = 'https://api.openalex.org/institutions'
const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
  headers: {
    Accept: 'application/json',
    'User-Agent': 'mailto:research@biointel.local',
  },
}

export interface OpenAlexInstitution {
  openAlexId: string
  name: string
  type: string
  countryCode: string
  city: string
  region: string
  rorId: string | null
  homepage: string | null
  worksCount: number | null
  /** IPEDS / Scorecard unit id when present */
  unitid: string | null
  openAlexUrl: string
}

function mapInst(raw: Record<string, unknown>): OpenAlexInstitution | null {
  const name = String(raw.display_name ?? '').trim()
  if (!name) return null
  const id = String(raw.id ?? '').replace('https://openalex.org/', '')
  const geo = (raw.geo ?? {}) as Record<string, unknown>
  const ids = (raw.ids ?? {}) as Record<string, unknown>
  const ror = ids.ror ? String(ids.ror).replace(/^https?:\/\/ror\.org\//i, '') : null
  // OpenAlex sometimes exposes ids.mag etc.; unitid not standard — leave null
  return {
    openAlexId: id,
    name,
    type: String(raw.type ?? ''),
    countryCode: String(raw.country_code ?? geo.country_code ?? ''),
    city: String(geo.city ?? '').trim(),
    region: String(geo.region ?? '').trim(),
    rorId: ror,
    homepage: raw.homepage_url ? String(raw.homepage_url) : null,
    worksCount: typeof raw.works_count === 'number' ? raw.works_count : null,
    unitid: null,
    openAlexUrl: id ? `https://openalex.org/${id}` : 'https://openalex.org/',
  }
}

/**
 * Search US education institutions by name (OpenAlex, no key).
 */
export async function searchOpenAlexUsEducation(
  query: string,
  limit = 15,
): Promise<OpenAlexInstitution[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const params = new URLSearchParams({
    search: q,
    filter: 'country_code:US,type:education',
    per_page: String(Math.min(50, Math.max(1, limit))),
  })
  try {
    const res = await fetch(`${BASE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Record<string, unknown>[] }
    return (data.results ?? [])
      .map(mapInst)
      .filter((i): i is OpenAlexInstitution => i != null)
      .slice(0, limit)
  } catch {
    return []
  }
}
