/**
 * US College Scorecard (Dept of Education) — free public API via api.data.gov.
 * Default DEMO_KEY for development; set DATA_GOV_API_KEY for higher limits (still free).
 * Not admissions advice — institutional directory for research affiliation context.
 * @see https://collegescorecard.ed.gov/data/api-documentation/
 * @see docs/design/orgs-hospitals-compendium.md
 */

const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface UsCollege {
  id: string
  name: string
  city: string
  state: string
  zip: string
  schoolUrl: string | null
  ownership: string
  /** Predominant degree: 0=not classified, 1=certificate, 2=associate, 3=bachelor, 4=graduate */
  predominantDegree: string
  studentSize: number | null
  carnegieBasic: string
  locale: string
  scorecardUrl: string
  matchSource?: string
}

function apiKey(): string {
  return (
    process.env.DATA_GOV_API_KEY ||
    process.env.COLLEGE_SCORECARD_API_KEY ||
    process.env.NEXT_PUBLIC_DATA_GOV_API_KEY ||
    'DEMO_KEY'
  )
}

const OWNERSHIP: Record<string, string> = {
  '1': 'Public',
  '2': 'Private nonprofit',
  '3': 'Private for-profit',
}

const DEGREE: Record<string, string> = {
  '0': 'Not classified',
  '1': 'Certificate',
  '2': 'Associate',
  '3': 'Bachelor',
  '4': 'Graduate',
}

const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.zip',
  'school.school_url',
  'school.ownership',
  'school.degrees_awarded.predominant',
  'school.carnegie_basic',
  'school.locale',
  'latest.student.size',
].join(',')

function mapSchool(raw: Record<string, unknown>, matchSource?: string): UsCollege | null {
  const name = String(raw['school.name'] ?? '').trim()
  const id = String(raw.id ?? '').trim()
  if (!name) return null
  const own = String(raw['school.ownership'] ?? '')
  const deg = String(raw['school.degrees_awarded.predominant'] ?? '')
  const sizeRaw = raw['latest.student.size']
  const urlRaw = String(raw['school.school_url'] ?? '').trim()
  const schoolUrl = urlRaw
    ? urlRaw.startsWith('http')
      ? urlRaw
      : `https://${urlRaw.replace(/\/$/, '')}`
    : null
  return {
    id: id || name,
    name,
    city: String(raw['school.city'] ?? '').trim(),
    state: String(raw['school.state'] ?? '').trim(),
    zip: String(raw['school.zip'] ?? '').trim(),
    schoolUrl,
    ownership: OWNERSHIP[own] || own || '',
    predominantDegree: DEGREE[deg] || deg || '',
    studentSize: typeof sizeRaw === 'number' ? sizeRaw : sizeRaw != null ? Number(sizeRaw) || null : null,
    carnegieBasic: String(raw['school.carnegie_basic'] ?? '').trim(),
    locale: String(raw['school.locale'] ?? '').trim(),
    scorecardUrl: `https://collegescorecard.ed.gov/school/?${id}`,
    matchSource,
  }
}

/**
 * Search US colleges/universities by name (College Scorecard).
 */
export async function searchUsCollegesByName(
  query: string,
  limit = 15,
): Promise<UsCollege[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []
  const params = new URLSearchParams({
    'school.name': q,
    per_page: String(Math.min(50, Math.max(1, limit))),
    page: '0',
    fields: FIELDS,
    api_key: apiKey(),
  })
  try {
    const res = await fetch(`${BASE}?${params.toString()}`, fetchOptions)
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Record<string, unknown>[] }
    return (data.results ?? [])
      .map((r) => mapSchool(r, 'scorecard'))
      .filter((c): c is UsCollege => c != null)
      .slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Resolve institute-like names against College Scorecard (best first hits).
 */
export async function resolveUsCollegesByNames(
  names: string[],
  limit = 10,
): Promise<UsCollege[]> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const n of names) {
    const t = n.trim()
    if (!t || t.length < 4) continue
    // Skip pure agency codes that won't match Scorecard
    if (/^national institutes of health$/i.test(t)) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(t)
    if (unique.length >= limit) break
  }
  const out: UsCollege[] = []
  const byId = new Set<string>()
  for (const name of unique) {
    const hits = await searchUsCollegesByName(name, 2)
    for (const c of hits) {
      if (byId.has(c.id)) continue
      byId.add(c.id)
      out.push({ ...c, matchSource: `name:${name}` })
      if (out.length >= limit) return out
    }
  }
  return out
}
