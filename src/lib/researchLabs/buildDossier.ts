/**
 * Pure: assemble ResearchLabDossier from free public DTOs.
 */

import type { RorOrganization } from '@/lib/api/ror'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { OpenAlexInstitution } from '@/lib/api/openAlexInstitutions'
import { buildOrgAffiliationJoins } from '@/lib/orgAffiliationJoin'
import type {
  ResearchLabDossier,
  ResearchLabGrantHint,
  ResearchLabKind,
  ResearchLabOpenAireHint,
} from './types'

function guessKind(input: {
  ror: RorOrganization[]
  colleges: UsCollege[]
  hospitals: CmsHospital[]
  openAlex: OpenAlexInstitution[]
}): ResearchLabKind {
  const types = new Set(
    input.ror.flatMap((o) => o.types.map((t) => t.toLowerCase())),
  )
  if (types.has('education') || input.colleges.length > 0) {
    if (input.colleges.some((c) => /university/i.test(c.name))) return 'university'
    return input.colleges.length ? 'college' : 'university'
  }
  if (types.has('healthcare') || input.hospitals.length > 0) return 'healthcare'
  if (types.has('facility') || types.has('archive')) return 'research-lab'
  if (types.has('funder')) return 'funder'
  const oaType = (input.openAlex[0]?.type || '').toLowerCase()
  if (oaType.includes('education')) return 'university'
  if (oaType.includes('facility')) return 'research-lab'
  if (oaType.includes('healthcare')) return 'healthcare'
  return 'other'
}

function primaryName(input: {
  query: string
  ror: RorOrganization[]
  colleges: UsCollege[]
  openAlex: OpenAlexInstitution[]
}): string {
  return (
    input.ror[0]?.name ||
    input.openAlex[0]?.name ||
    input.colleges[0]?.name ||
    input.query.trim() ||
    'Unknown institution'
  )
}

export function buildResearchLabDossier(input: {
  query: string
  rorOrgs?: readonly RorOrganization[] | null
  openAlexInstitutions?: readonly OpenAlexInstitution[] | null
  colleges?: readonly UsCollege[] | null
  hospitals?: readonly CmsHospital[] | null
  grants?: readonly ResearchLabGrantHint[] | null
  openAire?: readonly ResearchLabOpenAireHint[] | null
  builtAt?: string
}): ResearchLabDossier {
  const query = input.query.trim()
  const rorOrgs = [...(input.rorOrgs ?? [])]
  const openAlexInstitutions = [...(input.openAlexInstitutions ?? [])]
  const colleges = [...(input.colleges ?? [])]
  const hospitals = [...(input.hospitals ?? [])]
  const grants = [...(input.grants ?? [])]
  const openAire = [...(input.openAire ?? [])]
  const notes: string[] = []

  const { edges, notes: joinNotes } = buildOrgAffiliationJoins({
    sponsors: grants
      .map((g) => g.institute)
      .filter(Boolean)
      .slice(0, 20)
      .map((name) => ({ name })),
    rorOrgs,
    hospitals,
    colleges,
  })
  notes.push(...joinNotes)

  if (rorOrgs.length === 0 && colleges.length === 0 && openAlexInstitutions.length === 0) {
    notes.push(
      'No structured institution rows yet — try a fuller name (e.g. “Harvard University”) or enable EU pack search.',
    )
  }

  const deepLinks: ResearchLabDossier['deepLinks'] = []
  for (const o of rorOrgs.slice(0, 5)) {
    deepLinks.push({
      label: `ROR · ${o.name}`,
      url: `https://ror.org/${o.rorId}`,
      source: 'ror',
    })
  }
  for (const i of openAlexInstitutions.slice(0, 5)) {
    deepLinks.push({
      label: `OpenAlex · ${i.name}`,
      url: i.openAlexUrl,
      source: 'openalex',
    })
  }
  for (const c of colleges.slice(0, 3)) {
    deepLinks.push({
      label: `Scorecard · ${c.name}`,
      url: c.scorecardUrl,
      source: 'scorecard',
    })
  }
  if (query) {
    deepLinks.push({
      label: 'NIH RePORTER search',
      url: `https://reporter.nih.gov/search/results?query=${encodeURIComponent(query)}`,
      source: 'nih-reporter',
    })
    deepLinks.push({
      label: 'OpenAIRE explore',
      url: `https://explore.openaire.eu/search/find?keyword=${encodeURIComponent(query)}`,
      source: 'openaire',
    })
  }

  const totalWorksHint = openAlexInstitutions.reduce(
    (s, i) => s + (i.worksCount ?? 0),
    0,
  )

  const name = primaryName({ query, ror: rorOrgs, colleges, openAlex: openAlexInstitutions })
  const kind = guessKind({
    ror: rorOrgs,
    colleges,
    hospitals,
    openAlex: openAlexInstitutions,
  })

  return {
    query,
    builtAt: input.builtAt ?? new Date().toISOString(),
    name,
    kind,
    rorOrgs: rorOrgs.slice(0, 24),
    openAlexInstitutions: openAlexInstitutions.slice(0, 20),
    colleges: colleges.slice(0, 16),
    hospitals: hospitals.slice(0, 16),
    grants: grants.slice(0, 24),
    openAire: openAire.slice(0, 16),
    affiliationEdges: edges,
    deepLinks,
    notes: Array.from(new Set(notes)).slice(0, 6),
    stats: {
      rorCount: rorOrgs.length,
      openAlexCount: openAlexInstitutions.length,
      collegeCount: colleges.length,
      hospitalCount: hospitals.length,
      grantCount: grants.length,
      openAireCount: openAire.length,
      edgeCount: edges.length,
      totalWorksHint,
    },
    ready: true,
  }
}
