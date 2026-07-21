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
  /** Short secondary line (e.g. brand samples) */
  detail?: string
  /**
   * Official http(s) deep link only — never homepage shells or empty strings.
   * If absent, chip is not clickable.
   */
  href?: string
  /** Why this chip is present (for styled tooltip) */
  whyShowing?: string
  /** What user learns by navigating (for styled tooltip) */
  learnMore?: string
  /** Free-source method / caveats */
  method?: string
  /** Register / portal name for transparency */
  sourceName?: string
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
  const httpHref = (u: string | null | undefined): string | undefined => {
    const s = (u || '').trim()
    return /^https?:\/\//i.test(s) ? s : undefined
  }

  if (bla > 0 || pb > 0 || orange > 0) {
    const parts = [
      bla ? `${bla} BLA / Drugs@FDA licensed biologic rows` : '',
      pb ? `${pb} Purple Book product rows` : '',
      orange ? `${orange} Orange Book entries` : '',
    ].filter(Boolean)
    // Prefer official search/portal deep links (stable public URLs)
    const usHref =
      httpHref(links.find((l) => l.id === 'fda' || /fda/i.test(l.label))?.url) ||
      (pb > 0
        ? 'https://purplebooksearch.fda.gov/'
        : bla > 0
          ? 'https://www.accessdata.fda.gov/scripts/cder/daf/'
          : 'https://www.accessdata.fda.gov/scripts/cder/ob/')
    jurisdictions.push({
      id: 'us',
      region: 'US',
      label: 'US (BLA / Purple / Orange)',
      count: bla + pb + orange,
      detail: parts.join(' · '),
      href: usHref,
      sourceName: 'U.S. FDA free public registers',
      whyShowing: `Free US register rows loaded for ${moleculeName}: ${parts.join('; ')}. Chip appears only when at least one of BLA, Purple Book, or Orange Book lists is non-empty from free public APIs/caches.`,
      learnMore:
        'Open the linked FDA portal to inspect licensed biologics/biosimilar roles (Purple Book), application/product pages (Drugs@FDA / BLA), or therapeutic equivalence listings (Orange Book). BioIntel only counts free public rows — not approval recommendations.',
      method:
        'Deterministic count join from profile panels (openFDA Drugs@FDA BLA, Purple Book cache, Orange Book). Not LLM ranking or competitive intelligence scores.',
    })
  }
  if (hc.length > 0) {
    const samples = hc
      .slice(0, 2)
      .map((p) => p.brandName || p.din)
      .filter(Boolean)
      .join(', ')
    const hcHref =
      httpHref(hc[0]?.url) ||
      httpHref(links.find((l) => l.id === 'health_canada' || /canada/i.test(l.label))?.url) ||
      'https://health-products.canada.ca/dpd-bdpp/index-eng.jsp'
    jurisdictions.push({
      id: 'ca',
      region: 'CA',
      label: 'Health Canada DPD',
      count: hc.length,
      detail: samples || undefined,
      href: hcHref,
      sourceName: 'Health Canada Drug Product Database',
      whyShowing: `${hc.length} Health Canada DPD product row(s) matched for ${moleculeName} via free public DPD API. Sample: ${samples || 'see portal'}.`,
      learnMore:
        'Navigate to DPD (or the product deep link when available) for DIN, brand, status, and ingredient framing in Canada. Not a prescribing or import decision tool.',
      method:
        'Count of free-public DPD hits attached to this molecule profile. Deep link prefers product URL when present; otherwise DPD search portal.',
    })
  }
  if (emaBulk > 0 || emaMed > 0) {
    const emaHref =
      httpHref(links.find((l) => l.id === 'ema')?.url) ||
      `https://www.ema.europa.eu/en/search?search_api_fulltext=${encodeURIComponent(moleculeName)}`
    jurisdictions.push({
      id: 'eu',
      region: 'EU',
      label: 'EMA medicines',
      count: emaBulk + emaMed,
      detail: emaBulk ? `${emaBulk} bulk dump` : `${emaMed} search rows`,
      href: emaHref,
      sourceName: 'European Medicines Agency',
      whyShowing: `EU-facing free data present: ${emaBulk ? `${emaBulk} EMA bulk medicine row(s)` : ''}${emaBulk && emaMed ? ' + ' : ''}${emaMed ? `${emaMed} EMA search hit(s)` : ''} for ${moleculeName}.`,
      learnMore:
        'Open EMA public search / medicine pages for EU product names, EPAR entry points, and authorization framing. Bulk rows are dump-derived; always verify on the live EMA record.',
      method:
        'Deterministic counts from EMA bulk Excel/JSON caches and/or free EMA-facing search joins. Portal deep link is official EMA search — not a scraped shadow page.',
    })
  }
  // Portal-only jurisdictions (UK/AU/JP) — only when an http deep link exists
  for (const id of ['mhra', 'tga', 'pmda'] as const) {
    const link = links.find((l) => l.id === id || String(l.id).startsWith(id))
    const href = httpHref(link?.url)
    if (link && href) {
      jurisdictions.push({
        id,
        region: link.region || id.toUpperCase(),
        label: link.label,
        count: 0,
        detail: link.kind === 'search' ? 'Name search portal' : 'Official portal',
        href,
        sourceName: link.label,
        whyShowing: `International regulator deep link prepared for ${moleculeName} (${link.region}). No structured row count in BioIntel — portal-first free path only.`,
        learnMore: `${link.description || 'Open the official regulator portal'} to search product information, labels, or public registers for this name. Expect search results, not a BioIntel-hosted database.`,
        method:
          'Portal-first deep link from free public regulator sites (no scrape). Chip is shown only when a stable http(s) URL is available.',
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
