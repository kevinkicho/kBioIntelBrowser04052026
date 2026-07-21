/**
 * Lightweight free-API typeahead for universities / colleges / research labs.
 * Merges ROR + US College Scorecard + OpenAlex institution hits (no paid keys).
 */

import { searchRorOrganizations, type RorOrganization } from '@/lib/api/ror'
import { searchUsCollegesByName, type UsCollege } from '@/lib/api/collegeScorecard'
import {
  searchOpenAlexInstitutions,
  type OpenAlexInstitution,
} from '@/lib/api/openAlexInstitutions'

export type OrgSuggestSource = 'ror' | 'college' | 'openalex'

export interface OrgSuggestion {
  /** Stable key for list rendering */
  id: string
  /** Value filled into the search field / pipeline query */
  name: string
  source: OrgSuggestSource
  /** Short secondary line (city · country · types) */
  meta: string
  countryCode?: string
  city?: string
  types?: string[]
  /** Optional deep link to registry record */
  href?: string
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function rorToSuggestion(o: RorOrganization): OrgSuggestion {
  const meta = [o.city, o.countryName || o.countryCode, o.types.slice(0, 3).join(', ')]
    .filter(Boolean)
    .join(' · ')
  return {
    id: `ror:${o.rorId}`,
    name: o.name,
    source: 'ror',
    meta: meta || 'ROR research organization',
    countryCode: o.countryCode || undefined,
    city: o.city || undefined,
    types: o.types,
    href: o.idUrl || `https://ror.org/${o.rorId}`,
  }
}

function collegeToSuggestion(c: UsCollege): OrgSuggestion {
  const meta = [c.city, c.state, c.ownership, 'US college'].filter(Boolean).join(' · ')
  return {
    id: `college:${c.id}`,
    name: c.name,
    source: 'college',
    meta,
    countryCode: 'US',
    city: c.city || undefined,
    types: ['education'],
    href: c.scorecardUrl,
  }
}

function openAlexToSuggestion(i: OpenAlexInstitution): OrgSuggestion {
  const meta = [i.city, i.countryCode, i.type, 'OpenAlex']
    .filter(Boolean)
    .join(' · ')
  return {
    id: `openalex:${i.openAlexId}`,
    name: i.name,
    source: 'openalex',
    meta: meta || 'OpenAlex institution',
    countryCode: i.countryCode || undefined,
    city: i.city || undefined,
    types: i.type ? [i.type] : undefined,
    href: i.homepage || i.openAlexUrl || undefined,
  }
}

const SOURCE_RANK: Record<OrgSuggestSource, number> = {
  ror: 0,
  college: 1,
  openalex: 2,
}

/**
 * Parallel free-API typeahead. Prefer ROR rows; fill with colleges + OpenAlex.
 * Tuned for interactive latency: no IPEDS enrich, no multi-type AND filters,
 * single OpenAlex search (not 3 parallel type splits).
 */
export async function searchOrgSuggestions(
  query: string,
  opts?: { countryCode?: string; limit?: number },
): Promise<OrgSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const limit = Math.min(20, Math.max(4, opts?.limit ?? 12))
  const country = opts?.countryCode?.trim().toUpperCase() || undefined

  const wantColleges = !country || country === 'US'
  // ROR comma-joined types:N filters are AND — empty for typeahead; rank by name match instead.
  const [rorRows, colleges, openAlex] = await Promise.all([
    searchRorOrganizations(q, {
      countryCode: country,
    }).catch(() => [] as RorOrganization[]),
    wantColleges
      ? searchUsCollegesByName(q, Math.min(10, limit), { enrichIpeds: false }).catch(
          () => [] as UsCollege[],
        )
      : Promise.resolve([] as UsCollege[]),
    // Single untyped search is enough for typeahead (faster than edu+facility+healthcare)
    searchOpenAlexInstitutions(q, {
      limit: Math.min(10, limit),
      countryCode: country,
    }).catch(() => [] as OpenAlexInstitution[]),
  ])

  const ranked: OrgSuggestion[] = [
    ...rorRows.map(rorToSuggestion),
    ...colleges.map(collegeToSuggestion),
    ...openAlex.map(openAlexToSuggestion),
  ]

  // Prefer exact match → starts-with → contains; then shorter names; education; source.
  // Cache normalized names so sort/dedupe do not re-regex every comparison.
  const qn = normName(q)
  const normCache = new Map<string, string>()
  const nn = (name: string) => {
    let v = normCache.get(name)
    if (v === undefined) {
      v = normName(name)
      normCache.set(name, v)
    }
    return v
  }
  const matchTier = (name: string): number => {
    const n = nn(name)
    if (n === qn) return 0
    if (n.startsWith(qn + ' ')) return 1
    if (n.startsWith(qn)) return 2
    if (n.includes(qn)) return 3
    return 4
  }
  const educationBoost = (s: OrgSuggestion): number => {
    const types = (s.types ?? []).map((t) => t.toLowerCase())
    if (types.some((t) => t.includes('education') || t === 'university' || t === 'college')) {
      return 0
    }
    if (s.source === 'college') return 0
    if (types.some((t) => t.includes('healthcare') || t.includes('facility'))) return 1
    return 2
  }
  ranked.sort((a, b) => {
    const ta = matchTier(a.name)
    const tb = matchTier(b.name)
    if (ta !== tb) return ta - tb
    const ea = educationBoost(a)
    const eb = educationBoost(b)
    if (ea !== eb) return ea - eb
    const lenDiff = a.name.length - b.name.length
    if (Math.abs(lenDiff) > 4) return lenDiff
    if (SOURCE_RANK[a.source] !== SOURCE_RANK[b.source]) {
      return SOURCE_RANK[a.source] - SOURCE_RANK[b.source]
    }
    return nn(a.name).localeCompare(nn(b.name))
  })

  // Round-robin fill so Scorecard / OpenAlex appear even when ROR has many hits
  const bySource: Record<OrgSuggestSource, OrgSuggestion[]> = {
    ror: [],
    college: [],
    openalex: [],
  }
  const seenGlobal = new Set<string>()
  for (const s of ranked) {
    const key = nn(s.name)
    if (!key || seenGlobal.has(key)) continue
    seenGlobal.add(key)
    bySource[s.source].push(s)
  }
  const out: OrgSuggestion[] = []
  const seenOut = new Set<string>()
  const order: OrgSuggestSource[] = ['ror', 'college', 'openalex']
  let guard = 0
  while (out.length < limit && guard < limit * 4) {
    guard += 1
    let added = false
    for (const src of order) {
      const next = bySource[src].shift()
      if (!next) continue
      const key = nn(next.name)
      if (seenOut.has(key)) continue
      seenOut.add(key)
      out.push(next)
      added = true
      if (out.length >= limit) break
    }
    if (!added) break
  }
  out.sort((a, b) => {
    const ta = matchTier(a.name)
    const tb = matchTier(b.name)
    if (ta !== tb) return ta - tb
    return educationBoost(a) - educationBoost(b)
  })
  return out
}

export function orgSuggestSourceLabel(source: OrgSuggestSource): string {
  switch (source) {
    case 'ror':
      return 'ROR'
    case 'college':
      return 'Scorecard'
    case 'openalex':
      return 'OpenAlex'
    default:
      return source
  }
}
