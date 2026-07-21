/**
 * Landscape claims for board/evidence packs: sponsors, sites, ROR orgs, hospitals, grants.
 * claimType: other — does not invent efficacy.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'
import type { HealthCanadaDpdProduct } from '@/lib/api/healthCanadaDpd'
import type { RegulatorDeepLink } from '@/lib/regulatorDeepLinks'
import { buildClaim } from '../buildClaim'
import type { ClaimExtractorContext } from '../context'
import { applyLimit } from '../context'
import { buildBiosimilarFamily } from '@/lib/biosimilarFamily'
import { buildEvidenceNeighborhood } from '@/lib/evidenceNeighborhood'
import { buildLandscapeDualStrip } from '@/lib/landscapeDualStrip'

export const LANDSCAPE_SOURCE = 'BioIntel landscape (free public joins)'

export interface LandscapeEvidenceInput {
  moleculeName?: string
  clinicalTrials?: readonly ClinicalTrial[] | null
  researchOrgs?: readonly RorOrganization[] | null
  researchOrgsLit?: readonly RorOrganization[] | null
  euResearchOrgs?: readonly RorOrganization[] | null
  usHospitals?: readonly CmsHospital[] | null
  usColleges?: readonly UsCollege[] | null
  nihGrants?: readonly { institute?: string; title?: string; projectNumber?: string }[] | null
  literature?: readonly unknown[] | null
  pubmedArticles?: readonly unknown[] | null
  openAlexWorks?: readonly unknown[] | null
  biologicsLicensed?: readonly BiologicLicensedProduct[] | null
  purpleBookProducts?: readonly PurpleBookProduct[] | null
  purpleBookPatents?: readonly PurpleBookPatent[] | null
  emaBulkMedicines?: readonly EmaBulkMedicine[] | null
  healthCanadaProducts?: readonly HealthCanadaDpdProduct[] | null
  emaMedicines?: readonly { name?: string }[] | null
  orangeBookEntries?: readonly unknown[] | null
  internationalRegulatorLinks?: readonly RegulatorDeepLink[] | null
}

/**
 * Pure: landscape summary + top entities → EvidenceClaim[] (claimType: other).
 */
export function extractClaimsFromLandscape(
  input: LandscapeEvidenceInput | null | undefined,
  ctx: ClaimExtractorContext,
): EvidenceClaim[] {
  if (!input) return []
  const moleculeName = input.moleculeName || ctx.moleculeName || 'Molecule'
  const claims: EvidenceClaim[] = []

  const neighborhood = buildEvidenceNeighborhood({
    moleculeName,
    clinicalTrials: input.clinicalTrials,
    researchOrgs: input.researchOrgs,
    researchOrgsLit: input.researchOrgsLit,
    euResearchOrgs: input.euResearchOrgs,
    usHospitals: input.usHospitals,
    usColleges: input.usColleges,
    nihGrants: input.nihGrants,
    literature: input.literature,
    pubmedArticles: input.pubmedArticles,
    openAlexWorks: input.openAlexWorks,
  })

  const s = neighborhood.stats
  claims.push(
    buildClaim({
      claimType: 'other',
      source: LANDSCAPE_SOURCE,
      naturalKey: `summary:${moleculeName}`,
      statement: `${moleculeName} evidence neighborhood: ${s.trialCount} trials, ${s.uniqueSponsors} sponsors, ${s.uniqueFacilities} facilities, ${s.rorOrgCount} ROR orgs, ${s.hospitalCount} CMS hospitals, ${s.grantInstituteCount} grant institutes, ${s.literatureCount} literature rows (free APIs; not clinical advice).`,
      ctx,
      sourceUrl: 'https://ror.org/',
      quote: s.countryHints.length ? `Countries/sites: ${s.countryHints.join(', ')}` : undefined,
    }),
  )

  // Top sponsors
  const sponsorNodes = neighborhood.nodes.filter((n) => n.kind === 'sponsor')
  for (const n of applyLimit(sponsorNodes, Math.min(ctx.limit ?? 8, 8))) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `sponsor:${n.label}`,
        statement: `Trial sponsor linked to ${moleculeName}: ${n.label}${n.count ? ` (${n.count} trial listings)` : ''}.`,
        ctx,
        sourceUrl: 'https://clinicaltrials.gov/',
        quote: n.detail,
      }),
    )
  }

  // Top ROR
  for (const n of applyLimit(
    neighborhood.nodes.filter((n) => n.kind === 'ror'),
    Math.min(ctx.limit ?? 8, 8),
  )) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `ror:${n.id}`,
        statement: `Research organization in ${moleculeName} neighborhood: ${n.label}${n.detail ? ` (${n.detail})` : ''}.`,
        ctx,
        sourceUrl: n.href || 'https://ror.org/',
        quote: n.detail,
      }),
    )
  }

  // CMS hospitals
  for (const n of applyLimit(
    neighborhood.nodes.filter((n) => n.kind === 'hospital'),
    5,
  )) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `hospital:${n.id}`,
        statement: `US Medicare hospital matched in ${moleculeName} neighborhood: ${n.label}.`,
        ctx,
        sourceUrl: n.href || 'https://www.medicare.gov/care-compare/',
        quote: n.detail,
      }),
    )
  }

  // Grant institutes
  for (const n of applyLimit(
    neighborhood.nodes.filter((n) => n.kind === 'grant-org'),
    6,
  )) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `grant:${n.label}`,
        statement: `NIH RePORTER institute for ${moleculeName}: ${n.label}${n.count ? ` (${n.count} projects)` : ''}.`,
        ctx,
        sourceUrl: 'https://reporter.nih.gov/',
      }),
    )
  }

  // Biosimilar family summary
  const family = buildBiosimilarFamily({
    moleculeName,
    purpleBookProducts: input.purpleBookProducts,
    biologicsLicensed: input.biologicsLicensed,
    purpleBookPatents: input.purpleBookPatents,
    emaBulkMedicines: input.emaBulkMedicines,
  })
  if (family.members.length > 0) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `biosimilar-family:${family.stem}`,
        statement: `Biosimilar family for ${family.stem || moleculeName}: ${family.originators.length} originator, ${family.biosimilars.length} biosimilar, ${family.interchangeables.length} interchangeable (Purple Book / BLA); ${family.patents.length} BPPT patents; ${family.emaBiosimilars.length} EMA biosimilar dump rows. Not interchangeability legal advice.`,
        ctx,
        sourceUrl: 'https://purplebooksearch.fda.gov/',
      }),
    )
  }

  // Multi-jurisdiction presence (structured counts + portal links)
  const dual = buildLandscapeDualStrip({
    moleculeName,
    purpleBookProducts: input.purpleBookProducts,
    biologicsLicensed: input.biologicsLicensed,
    purpleBookPatents: input.purpleBookPatents,
    emaBulkMedicines: input.emaBulkMedicines,
    clinicalTrials: input.clinicalTrials,
    researchOrgs: input.researchOrgs,
    researchOrgsLit: input.researchOrgsLit,
    euResearchOrgs: input.euResearchOrgs,
    usHospitals: input.usHospitals,
    usColleges: input.usColleges,
    nihGrants: input.nihGrants,
    literature: input.literature,
    pubmedArticles: input.pubmedArticles,
    openAlexWorks: input.openAlexWorks,
    healthCanadaProducts: input.healthCanadaProducts,
    emaMedicines: input.emaMedicines,
    orangeBookEntries: input.orangeBookEntries,
    internationalRegulatorLinks: input.internationalRegulatorLinks,
  })
  const withCounts = dual.jurisdictions.filter((j) => j.count > 0)
  if (withCounts.length > 0) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `jurisdictions:${moleculeName}`,
        statement: `${moleculeName} multi-jurisdiction free-data presence: ${withCounts
          .map((j) => `${j.region} ${j.count}${j.detail ? ` (${j.detail})` : ''}`)
          .join('; ')}. Counts are public-register rows, not approval recommendations.`,
        ctx,
        sourceUrl: withCounts[0]?.href || 'https://www.ema.europa.eu/en/medicines',
        quote: dual.jurisdictions
          .filter((j) => j.href)
          .slice(0, 4)
          .map((j) => j.label)
          .join(' · '),
      }),
    )
  }
  for (const j of applyLimit(withCounts, 4)) {
    claims.push(
      buildClaim({
        claimType: 'other',
        source: LANDSCAPE_SOURCE,
        naturalKey: `jurisdiction:${j.id}`,
        statement: `${moleculeName} · ${j.label}: ${j.count} free public row(s)${j.detail ? ` — ${j.detail}` : ''}.`,
        ctx,
        sourceUrl: j.href,
        quote: j.detail,
      }),
    )
  }

  return claims
}
