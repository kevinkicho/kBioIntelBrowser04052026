/**
 * Research university / college / lab dossier — free public sources only.
 * Affiliation context for trials, grants, literature — not admissions or clinical referral.
 */

import type { RorOrganization } from '@/lib/api/ror'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { OpenAlexInstitution } from '@/lib/api/openAlexInstitutions'
import type { AffiliationEdge } from '@/lib/orgAffiliationJoin'

export type ResearchLabKind =
  | 'university'
  | 'college'
  | 'research-lab'
  | 'healthcare'
  | 'funder'
  | 'facility'
  | 'other'

export interface ResearchLabGrantHint {
  projectNumber: string
  title: string
  institute: string
  piName: string
  fundingAmount: number
  startDate: string
  endDate: string
}

export interface ResearchLabOpenAireHint {
  id: string
  title: string
  kind: 'project' | 'publication'
  href?: string
}

export interface ResearchLabDossier {
  /** User query that built this dossier */
  query: string
  builtAt: string
  /** Primary display name */
  name: string
  kind: ResearchLabKind
  /** ROR rows (canonical research org IDs) */
  rorOrgs: RorOrganization[]
  /** OpenAlex institution rows (works counts, ROR crosswalk) */
  openAlexInstitutions: OpenAlexInstitution[]
  /** US College Scorecard / OpenAlex-fallback colleges */
  colleges: UsCollege[]
  /** CMS hospitals (when healthcare-adjacent) */
  hospitals: CmsHospital[]
  /** NIH RePORTER projects matching org/query */
  grants: ResearchLabGrantHint[]
  /** OpenAIRE free research products (optional) */
  openAire: ResearchLabOpenAireHint[]
  /** Deterministic affiliation edges within this bag */
  affiliationEdges: AffiliationEdge[]
  /** Deep-link shortcuts */
  deepLinks: Array<{ label: string; url: string; source: string }>
  /** Honest pipeline notes */
  notes: string[]
  stats: {
    rorCount: number
    openAlexCount: number
    collegeCount: number
    hospitalCount: number
    grantCount: number
    openAireCount: number
    edgeCount: number
    totalWorksHint: number
  }
  ready: true
}
