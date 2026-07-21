/**
 * US College Scorecard (Dept of Education) — free public API via api.data.gov.
 * Default DEMO_KEY for development; set DATA_GOV_API_KEY for higher limits (still free).
 * Fallback chain (no paid keys): Scorecard → OpenAlex US education → optional Urban IPEDS enrich.
 * Not admissions advice — institutional directory for research affiliation context.
 * @see https://collegescorecard.ed.gov/data/api-documentation/
 * @see docs/design/orgs-hospitals-compendium.md
 */

import { searchOpenAlexUsEducation } from './openAlexInstitutions'
import { getUrbanIpedsByUnitid } from './urbanIpeds'

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
  /** Scorecard | openalex | ipeds */
  source?: string
  phone?: string
  address?: string
  rorId?: string | null
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
    source: 'scorecard',
    matchSource,
  }
}

async function searchScorecardOnly(query: string, limit: number): Promise<UsCollege[]> {
  const params = new URLSearchParams({
    'school.name': query,
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

async function searchOpenAlexAsColleges(query: string, limit: number): Promise<UsCollege[]> {
  const rows = await searchOpenAlexUsEducation(query, limit)
  return rows.map((r) => ({
    id: r.openAlexId || r.name,
    name: r.name,
    city: r.city,
    state: r.region,
    zip: '',
    schoolUrl: r.homepage,
    ownership: '',
    predominantDegree: r.type || 'education',
    studentSize: null,
    carnegieBasic: '',
    locale: '',
    scorecardUrl: r.openAlexUrl,
    source: 'openalex',
    rorId: r.rorId,
    matchSource: 'openalex-fallback',
  }))
}

/**
 * Enrich Scorecard rows with Urban IPEDS directory fields (address, phone, website).
 * Best-effort; failures leave Scorecard fields intact.
 */
export async function enrichCollegesWithIpeds(colleges: UsCollege[]): Promise<UsCollege[]> {
  const out: UsCollege[] = []
  for (const c of colleges.slice(0, 8)) {
    const unitid = /^\d+$/.test(c.id) ? c.id : ''
    if (!unitid) {
      out.push(c)
      continue
    }
    try {
      const ipeds = await getUrbanIpedsByUnitid(unitid)
      if (!ipeds) {
        out.push(c)
        continue
      }
      out.push({
        ...c,
        address: ipeds.address || c.address,
        phone: ipeds.phone || c.phone,
        schoolUrl: c.schoolUrl || ipeds.website,
        city: c.city || ipeds.city,
        state: c.state || ipeds.state,
        zip: c.zip || ipeds.zip,
        ownership: c.ownership || ipeds.control,
        source: c.source === 'scorecard' ? 'scorecard+ipeds' : c.source,
      })
    } catch {
      out.push(c)
    }
  }
  // append any beyond enrich cap
  for (const c of colleges.slice(8)) out.push(c)
  return out
}

/**
 * Search US colleges/universities by name.
 * Primary: College Scorecard. Fallback (no key): OpenAlex US education institutions.
 * Optional IPEDS enrich when Scorecard unitids are present.
 */
export async function searchUsCollegesByName(
  query: string,
  limit = 15,
  opts?: { enrichIpeds?: boolean },
): Promise<UsCollege[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []

  let rows = await searchScorecardOnly(q, limit)
  if (rows.length === 0) {
    rows = await searchOpenAlexAsColleges(q, limit)
  }
  if (opts?.enrichIpeds !== false && rows.some((r) => r.source?.startsWith('scorecard'))) {
    rows = await enrichCollegesWithIpeds(rows)
  }
  return rows.slice(0, limit)
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
