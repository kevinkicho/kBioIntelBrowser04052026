/**
 * Pure dual landscape strip model: biosimilar family + evidence neighborhood counts.
 * Deterministic free-API joins only; not clinical / competitive ranking.
 */

import { buildBiosimilarFamily } from '@/lib/biosimilarFamily'
import { buildEvidenceNeighborhood } from '@/lib/evidenceNeighborhood'
import type { BiologicLicensedProduct } from '@/lib/api/biologicsLicensed'
import type { PurpleBookProduct } from '@/lib/api/purpleBookCache'
import type { PurpleBookPatent } from '@/lib/api/purpleBookPatents'
import type { EmaBulkMedicine } from '@/lib/api/emaMedicinesBulk'
import type { ClinicalTrial } from '@/lib/types'
import type { RorOrganization } from '@/lib/api/ror'
import type { CmsHospital } from '@/lib/api/cmsHospitals'
import type { UsCollege } from '@/lib/api/collegeScorecard'
import type { HealthCanadaDpdProduct } from '@/lib/api/healthCanadaDpd'
import type { RegulatorDeepLink } from '@/lib/regulatorDeepLinks'

export interface LandscapeStripChip {
  id: string
  label: string
  value: string | number
  /** Optional panel id for scroll / quick-view */
  panelId?: string
  categoryId?: 'pharmaceutical' | 'clinical-safety' | 'research-literature'
  tone?: 'emerald' | 'violet' | 'amber' | 'sky' | 'slate' | 'rose'
}

export interface JurisdictionPresence {
  id: string
  region: string
  label: string
  count: number
  detail?: string
  href?: string
}

export interface LandscapeDualStripView {
  moleculeName: string
  family: {
    stem: string
    originators: number
    biosimilars: number
    interchangeables: number
    patents: number
    emaBiosimilars: number
    hasMembers: boolean
  }
  neighborhood: {
    trialCount: number
    sponsors: number
    facilities: number
    rorOrgs: number
    hospitals: number
    colleges: number
    grantOrgs: number
    literature: number
    hasEdges: boolean
  }
  jurisdictions: JurisdictionPresence[]
  familyChips: LandscapeStripChip[]
  neighborhoodChips: LandscapeStripChip[]
  notes: string[]
  /** True when any free-join signal is present */
  hasSignal: boolean
  ready: true
}

function asArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

/**
 * Build dual strip from a partial profile merged-data bag.
 */
export function buildLandscapeDualStrip(input: {
  moleculeName: string
  purpleBookProducts?: readonly PurpleBookProduct[] | null
  biologicsLicensed?: readonly BiologicLicensedProduct[] | null
  purpleBookPatents?: readonly PurpleBookPatent[] | null
  emaBulkMedicines?: readonly EmaBulkMedicine[] | null
  clinicalTrials?: readonly ClinicalTrial[] | null
  researchOrgs?: readonly RorOrganization[] | null
  researchOrgsLit?: readonly RorOrganization[] | null
  euResearchOrgs?: readonly RorOrganization[] | null
  usHospitals?: readonly CmsHospital[] | null
  usColleges?: readonly UsCollege[] | null
  nihGrants?: readonly { institute?: string; title?: string }[] | null
  literature?: readonly unknown[] | null
  pubmedArticles?: readonly unknown[] | null
  openAlexWorks?: readonly unknown[] | null
  healthCanadaProducts?: readonly HealthCanadaDpdProduct[] | null
  emaMedicines?: readonly { name?: string }[] | null
  orangeBookEntries?: readonly unknown[] | null
  internationalRegulatorLinks?: readonly RegulatorDeepLink[] | null
}): LandscapeDualStripView {
  const moleculeName = input.moleculeName?.trim() || 'Molecule'
  const notes: string[] = []

  const family = buildBiosimilarFamily({
    moleculeName,
    purpleBookProducts: input.purpleBookProducts,
    biologicsLicensed: input.biologicsLicensed,
    purpleBookPatents: input.purpleBookPatents,
    emaBulkMedicines: input.emaBulkMedicines,
  })

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

  const hc = input.healthCanadaProducts ?? []
  const emaBulk = (input.emaBulkMedicines ?? []).length
  const emaMed = (input.emaMedicines ?? []).length
  const bla = (input.biologicsLicensed ?? []).length
  const pb = (input.purpleBookProducts ?? []).length
  const orange = (input.orangeBookEntries ?? []).length
  const links = input.internationalRegulatorLinks ?? []

  const jurisdictions: JurisdictionPresence[] = []
  if (bla > 0 || pb > 0 || orange > 0) {
    jurisdictions.push({
      id: 'us',
      region: 'US',
      label: 'US (BLA / Purple / Orange)',
      count: bla + pb + orange,
      detail: [
        bla ? `${bla} BLA` : '',
        pb ? `${pb} Purple Book` : '',
        orange ? `${orange} Orange Book` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      href: links.find((l) => l.id === 'fda' || /fda/i.test(l.label))?.url,
    })
  }
  if (hc.length > 0) {
    jurisdictions.push({
      id: 'ca',
      region: 'CA',
      label: 'Health Canada DPD',
      count: hc.length,
      detail: hc
        .slice(0, 2)
        .map((p) => p.brandName || p.din)
        .filter(Boolean)
        .join(', '),
      href: hc[0]?.url,
    })
  }
  if (emaBulk > 0 || emaMed > 0) {
    jurisdictions.push({
      id: 'eu',
      region: 'EU',
      label: 'EMA medicines',
      count: emaBulk + emaMed,
      detail: emaBulk ? `${emaBulk} bulk dump` : `${emaMed} search rows`,
      href: links.find((l) => l.id === 'ema')?.url,
    })
  }
  // Portal-only jurisdictions (UK/AU/JP) when deep links present
  for (const id of ['mhra', 'tga', 'pmda'] as const) {
    const link = links.find((l) => l.id === id || String(l.id).startsWith(id))
    if (link) {
      jurisdictions.push({
        id,
        region: link.region || id.toUpperCase(),
        label: link.label,
        count: 0,
        detail: 'Portal search (no structured count)',
        href: link.url,
      })
    }
  }

  const familyChips: LandscapeStripChip[] = [
    {
      id: 'originators',
      label: 'Originator',
      value: family.originators.length,
      panelId: 'biosimilar-family',
      categoryId: 'pharmaceutical',
      tone: 'emerald',
    },
    {
      id: 'biosimilars',
      label: 'Biosimilar',
      value: family.biosimilars.length,
      panelId: 'biosimilar-family',
      categoryId: 'pharmaceutical',
      tone: 'violet',
    },
    {
      id: 'interchangeable',
      label: 'Interchangeable',
      value: family.interchangeables.length,
      panelId: 'biosimilar-family',
      categoryId: 'pharmaceutical',
      tone: 'amber',
    },
    {
      id: 'bppt',
      label: 'BPPT patents',
      value: family.patents.length,
      panelId: 'purple-book-patents',
      categoryId: 'pharmaceutical',
      tone: 'slate',
    },
  ]

  const s = neighborhood.stats
  const neighborhoodChips: LandscapeStripChip[] = [
    {
      id: 'trials',
      label: 'Trials',
      value: s.trialCount,
      panelId: 'clinical-trials',
      categoryId: 'clinical-safety',
      tone: 'sky',
    },
    {
      id: 'sponsors',
      label: 'Sponsors',
      value: s.uniqueSponsors,
      panelId: 'evidence-neighborhood',
      categoryId: 'clinical-safety',
      tone: 'sky',
    },
    {
      id: 'ror',
      label: 'ROR orgs',
      value: s.rorOrgCount,
      panelId: 'research-orgs',
      categoryId: 'clinical-safety',
      tone: 'violet',
    },
    {
      id: 'hospitals',
      label: 'CMS hospitals',
      value: s.hospitalCount,
      panelId: 'us-hospitals',
      categoryId: 'clinical-safety',
      tone: 'rose',
    },
    {
      id: 'grants',
      label: 'Grant orgs',
      value: s.grantInstituteCount,
      panelId: 'nih-reporter',
      categoryId: 'research-literature',
      tone: 'amber',
    },
    {
      id: 'lit',
      label: 'Lit rows',
      value: s.literatureCount,
      panelId: 'literature',
      categoryId: 'research-literature',
      tone: 'emerald',
    },
  ]

  if (!family.members.length && !neighborhood.edges.length) {
    notes.push(
      'Load Pharmaceutical + Clinical & Safety (+ Research & Literature) for denser landscape chips.',
    )
  }
  notes.push(...family.notes.slice(0, 2))
  notes.push(...neighborhood.notes.slice(0, 1))

  const hasSignal =
    family.members.length > 0 ||
    neighborhood.edges.length > 0 ||
    jurisdictions.some((j) => j.count > 0)

  return {
    moleculeName,
    family: {
      stem: family.stem,
      originators: family.originators.length,
      biosimilars: family.biosimilars.length,
      interchangeables: family.interchangeables.length,
      patents: family.patents.length,
      emaBiosimilars: family.emaBiosimilars.length,
      hasMembers: family.members.length > 0,
    },
    neighborhood: {
      trialCount: s.trialCount,
      sponsors: s.uniqueSponsors,
      facilities: s.uniqueFacilities,
      rorOrgs: s.rorOrgCount,
      hospitals: s.hospitalCount,
      colleges: s.collegeCount,
      grantOrgs: s.grantInstituteCount,
      literature: s.literatureCount,
      hasEdges: neighborhood.edges.length > 0,
    },
    jurisdictions,
    familyChips,
    neighborhoodChips,
    notes: Array.from(new Set(notes)).slice(0, 4),
    hasSignal,
    ready: true,
  }
}

/**
 * Convenience: build strip from profile mergedData bag.
 */
export function buildLandscapeDualStripFromProfileData(
  moleculeName: string,
  data: Record<string, unknown> | null | undefined,
): LandscapeDualStripView {
  const d = data ?? {}
  return buildLandscapeDualStrip({
    moleculeName,
    purpleBookProducts: asArr(d.purpleBookProducts),
    biologicsLicensed: asArr(d.biologicsLicensed),
    purpleBookPatents: asArr(d.purpleBookPatents),
    emaBulkMedicines: asArr(d.emaBulkMedicines),
    clinicalTrials: asArr(d.clinicalTrials),
    researchOrgs: asArr(d.researchOrgs),
    researchOrgsLit: asArr(d.researchOrgsLit),
    euResearchOrgs: asArr(d.euResearchOrgs),
    usHospitals: asArr(d.usHospitals),
    usColleges: asArr(d.usColleges),
    nihGrants: asArr(d.nihGrants),
    literature: asArr(d.literature),
    pubmedArticles: asArr(d.pubmedArticles),
    openAlexWorks: asArr(d.openAlexWorks),
    healthCanadaProducts: asArr(d.healthCanadaProducts),
    emaMedicines: asArr(d.emaMedicines),
    orangeBookEntries: asArr(d.orangeBookEntries),
    internationalRegulatorLinks: asArr(d.internationalRegulatorLinks),
  })
}
