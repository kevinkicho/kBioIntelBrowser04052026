/**
 * Lightweight free-API typeahead for universities / colleges / research labs.
 * Merges ROR + US College Scorecard + OpenAlex institution hits (no paid keys).
 */

import { searchRorOrganizations, type RorOrganization } from '@/lib/api/ror'
import { searchUsCollegesByName, type UsCollege } from '@/lib/api/collegeScorecard'
import {
  searchOpenAlexResearchLabs,
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
  const rorTypes =
    country === 'US'
      ? ['education', 'healthcare', 'facility']
      : ['education', 'facility', 'healthcare']

  const [ror, colleges, openAlex] = await Promise.all([
    searchRorOrganizations(q, {
      countryCode: country,
      types: rorTypes,
    }).catch(() => [] as RorOrganization[]),
    wantColleges
      ? searchUsCollegesByName(q, Math.min(10, limit)).catch(() => [] as UsCollege[])
      : Promise.resolve([] as UsCollege[]),
    searchOpenAlexResearchLabs(q, {
      limit: Math.min(10, limit),
      countryCode: country,
    }).catch(() => [] as OpenAlexInstitution[]),
  ])

  // If ROR typed filter is empty, retry untyped (some facilities omit education)
  let rorRows = ror
  if (rorRows.length === 0) {
    rorRows = await searchRorOrganizations(q, { countryCode: country }).catch(
      () => [] as RorOrganization[],
    )
  }

  const ranked: OrgSuggestion[] = [
    ...rorRows.map(rorToSuggestion),
    ...colleges.map(collegeToSuggestion),
    ...openAlex.map(openAlexToSuggestion),
  ]

  // Prefer names that start with / contain query; then source rank
  const qn = normName(q)
  ranked.sort((a, b) => {
    const an = normName(a.name)
    const bn = normName(b.name)
    const aStarts = an.startsWith(qn) ? 0 : an.includes(qn) ? 1 : 2
    const bStarts = bn.startsWith(qn) ? 0 : bn.includes(qn) ? 1 : 2
    if (aStarts !== bStarts) return aStarts - bStarts
    if (SOURCE_RANK[a.source] !== SOURCE_RANK[b.source]) {
      return SOURCE_RANK[a.source] - SOURCE_RANK[b.source]
    }
    return an.localeCompare(bn)
  })

  const seen = new Set<string>()
  const out: OrgSuggestion[] = []
  for (const s of ranked) {
    const key = normName(s.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(s)
    if (out.length >= limit) break
  }
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
