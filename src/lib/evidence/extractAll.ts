/**
 * Aggregate Core + supporting free-API claim extractors into a single claim list.
 * Packs cap ≤200 claims (design §5.4); default totalCap enforces this.
 * Supporting extractors densify Pack AI grounding without inventing efficacy.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type {
  AdverseEvent,
  ChemblActivity,
  ChemblIndication,
  ChemblMechanism,
  ClinicalTrial,
  ComputedProperties,
  DiseaseAssociation,
  DrugGeneInteraction,
  DrugRecall,
  LiteratureResult,
  NihGrant,
  Patent,
  PubMedArticle,
} from '@/lib/types'
import type { OpenAireProject, OpenAirePublication } from '@/lib/api/openaire'
import type { ClaimExtractorContext } from './context'
import {
  extractClaimsFromAdverseEvents,
  extractClaimsFromChemblActivities,
  extractClaimsFromChemblIndications,
  extractClaimsFromChemblMechanisms,
  extractClaimsFromClinicalTrials,
  extractClaimsFromDgidb,
  extractClaimsFromDrugLabels,
  extractClaimsFromLandscape,
  extractClaimsFromLiterature,
  extractClaimsFromNihGrants,
  extractClaimsFromOpenAlexWorks,
  extractClaimsFromOpenAireProjects,
  extractClaimsFromOpenAirePublications,
  extractClaimsFromOpenTargets,
  extractClaimsFromOrangeBook,
  extractClaimsFromPatents,
  extractClaimsFromProperties,
  extractClaimsFromPubMed,
  extractClaimsFromRecalls,
  extractClaimsFromRelatedMolecules,
  extractClaimsFromDrugsFda,
  extractClaimsFromOpenFdaLabelSections,
  extractClaimsFromNsfAwards,
  type DrugLabelRowLike,
  type DrugsFdaRowLike,
  type LandscapeEvidenceInput,
  type OpenAlexWorkLike,
  type OpenFdaLabelSectionClaimLike,
  type OrangeBookRowLike,
  type NsfAwardRowLike,
} from './extractors'
import type { DedupedDiseaseMolecule, DiseaseMolecule } from '@/lib/diseaseSearch'

/** Design §5.4 — versioned packs ≤200 claims. */
export const DEFAULT_CLAIM_TOTAL_CAP = 200

/** Default per-extractor soft caps so supporting sources share the 200 budget. */
const SUPPORTING_LIMIT = 8
const CORE_TRIAL_LIMIT = 15
const CORE_AE_LIMIT = 12
const CORE_ACTIVITY_LIMIT = 12

/** Core panel DTO bag used by profile / discovery depth. */
export interface CorePanelEvidenceInput {
  chemblActivities?: readonly ChemblActivity[] | null
  chemblMechanisms?: readonly ChemblMechanism[] | null
  adverseEvents?: readonly AdverseEvent[] | null
  clinicalTrials?: readonly ClinicalTrial[] | null
  diseaseAssociations?: readonly DiseaseAssociation[] | null
  /** Disease-related molecules with selection reasons (board density). */
  relatedMolecules?: readonly (DiseaseMolecule | DedupedDiseaseMolecule)[] | null
  diseaseName?: string
  /** Optional landscape join inputs (orgs, hospitals, grants, biologics family). */
  landscape?: LandscapeEvidenceInput | null

  // --- Supporting free-API bags (Pack AI density) ---
  patents?: readonly Patent[] | null
  nihGrants?: readonly NihGrant[] | null
  literature?: readonly LiteratureResult[] | null
  pubmedArticles?: readonly PubMedArticle[] | null
  openAlexWorks?: readonly OpenAlexWorkLike[] | null
  openAireProjects?: readonly OpenAireProject[] | null
  openAirePublications?: readonly OpenAirePublication[] | null
  drugRecalls?: readonly DrugRecall[] | null
  chemblIndications?: readonly ChemblIndication[] | null
  drugGeneInteractions?: readonly DrugGeneInteraction[] | null
  computedProperties?: ComputedProperties | null
  orangeBookEntries?: readonly OrangeBookRowLike[] | null
  drugLabels?: readonly DrugLabelRowLike[] | null
  drugsFdaApplications?: readonly DrugsFdaRowLike[] | null
  openFdaLabelSections?: readonly OpenFdaLabelSectionClaimLike[] | null
  nsfAwards?: readonly NsfAwardRowLike[] | null
}

export interface ExtractAllOptions extends ClaimExtractorContext {
  /**
   * Hard cap across all extractors after merge (default 200).
   * Pass null to disable.
   */
  totalCap?: number | null
  /**
   * Prefer higher-signal facets first when trimming to totalCap.
   * Default order: mechanism → binds-target → indicated-for → trial → safety → other.
   */
  preferFacetOrder?: boolean
  /**
   * When true, extract landscape claims first and keep a larger share of them
   * (board / profile landscape pack path). Still total-capped.
   */
  landscapeMode?: boolean
  /** Include supporting free-API extractors (default true). */
  includeSupporting?: boolean
}

const FACET_PRIORITY: Record<string, number> = {
  mechanism: 0,
  'binds-target': 1,
  'indicated-for': 2,
  trial: 3,
  safety: 4,
  property: 5,
  literature: 6,
  other: 7,
}

function sortByFacetPriority(claims: EvidenceClaim[]): EvidenceClaim[] {
  return [...claims].sort((a, b) => {
    const pa = FACET_PRIORITY[a.claimType] ?? 99
    const pb = FACET_PRIORITY[b.claimType] ?? 99
    if (pa !== pb) return pa - pb
    return a.id.localeCompare(b.id)
  })
}

/**
 * Deduplicate by claim id (content-addressed); first wins.
 */
export function dedupeClaimsById(claims: readonly EvidenceClaim[]): EvidenceClaim[] {
  const seen = new Set<string>()
  const out: EvidenceClaim[] = []
  for (const c of claims) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

function withLimit(ctx: ClaimExtractorContext, limit: number): ClaimExtractorContext {
  return { ...ctx, limit: ctx.limit ?? limit }
}

/**
 * Pure: extract EvidenceClaim[] from Core + supporting panel DTOs.
 * All provenance.retrievedAt values come from ctx.retrievedAt.
 */
export function extractClaimsFromCorePanels(
  panels: CorePanelEvidenceInput,
  options: ExtractAllOptions,
): EvidenceClaim[] {
  const {
    totalCap = DEFAULT_CLAIM_TOTAL_CAP,
    preferFacetOrder = true,
    landscapeMode = false,
    includeSupporting = true,
    ...ctx
  } = options

  const landscapeClaims = panels.landscape
    ? extractClaimsFromLandscape(
        {
          ...panels.landscape,
          moleculeName: panels.landscape.moleculeName || ctx.moleculeName,
          clinicalTrials: panels.landscape.clinicalTrials ?? panels.clinicalTrials,
          nihGrants: panels.landscape.nihGrants ?? panels.nihGrants,
          literature: panels.landscape.literature ?? panels.literature,
          pubmedArticles: panels.landscape.pubmedArticles ?? panels.pubmedArticles,
          openAlexWorks: panels.landscape.openAlexWorks ?? panels.openAlexWorks,
        },
        withLimit(ctx, 40),
      )
    : []

  const coreRaw: EvidenceClaim[] = [
    ...extractClaimsFromChemblMechanisms(
      panels.chemblMechanisms,
      withLimit(ctx, CORE_ACTIVITY_LIMIT),
    ),
    ...extractClaimsFromChemblActivities(
      panels.chemblActivities,
      withLimit(ctx, CORE_ACTIVITY_LIMIT),
    ),
    ...extractClaimsFromOpenTargets(
      panels.diseaseAssociations,
      withLimit(ctx, CORE_ACTIVITY_LIMIT),
    ),
    ...extractClaimsFromClinicalTrials(
      panels.clinicalTrials,
      withLimit(ctx, CORE_TRIAL_LIMIT),
    ),
    ...extractClaimsFromAdverseEvents(panels.adverseEvents, withLimit(ctx, CORE_AE_LIMIT)),
    ...extractClaimsFromRelatedMolecules(panels.relatedMolecules, {
      ...withLimit(ctx, 10),
      diseaseName: panels.diseaseName,
    }),
  ]

  const supportingRaw: EvidenceClaim[] = includeSupporting
    ? [
        ...extractClaimsFromChemblIndications(
          panels.chemblIndications,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromDgidb(
          panels.drugGeneInteractions,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromRecalls(panels.drugRecalls, withLimit(ctx, SUPPORTING_LIMIT)),
        ...extractClaimsFromProperties(panels.computedProperties, ctx),
        ...extractClaimsFromPatents(panels.patents, withLimit(ctx, SUPPORTING_LIMIT)),
        ...extractClaimsFromNihGrants(panels.nihGrants, withLimit(ctx, SUPPORTING_LIMIT)),
        ...extractClaimsFromLiterature(panels.literature, withLimit(ctx, SUPPORTING_LIMIT)),
        ...extractClaimsFromPubMed(panels.pubmedArticles, withLimit(ctx, SUPPORTING_LIMIT)),
        ...extractClaimsFromOpenAlexWorks(
          panels.openAlexWorks,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromOpenAireProjects(
          panels.openAireProjects,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromOpenAirePublications(
          panels.openAirePublications,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromOrangeBook(
          panels.orangeBookEntries,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromDrugLabels(panels.drugLabels, withLimit(ctx, 6)),
        ...extractClaimsFromDrugsFda(
          panels.drugsFdaApplications,
          withLimit(ctx, SUPPORTING_LIMIT),
        ),
        ...extractClaimsFromOpenFdaLabelSections(
          panels.openFdaLabelSections,
          withLimit(ctx, 12),
        ),
        ...extractClaimsFromNsfAwards(panels.nsfAwards, withLimit(ctx, SUPPORTING_LIMIT)),
      ]
    : []

  let claims: EvidenceClaim[]
  if (landscapeMode) {
    // Prefer landscape claims, then core, then supporting fill
    const landscape = dedupeClaimsById(landscapeClaims)
    const core = dedupeClaimsById([...coreRaw, ...supportingRaw])
    const seen = new Set(landscape.map((c) => c.id))
    const fill = core.filter((c) => !seen.has(c.id))
    if (preferFacetOrder) {
      // keep landscape order; facet-sort fill only
      const fillSorted = sortByFacetPriority(fill)
      if (totalCap != null && totalCap >= 0) {
        const landscapeCap = Math.min(
          landscape.length,
          Math.max(40, Math.floor(totalCap * 0.55)),
        )
        const head = landscape.slice(0, landscapeCap)
        const rest = fillSorted.slice(0, Math.max(0, totalCap - head.length))
        claims = [...head, ...rest]
      } else {
        claims = [...landscape, ...fillSorted]
      }
    } else if (totalCap != null && totalCap >= 0) {
      const landscapeCap = Math.min(landscape.length, Math.max(40, Math.floor(totalCap * 0.55)))
      const head = landscape.slice(0, landscapeCap)
      const rest = fill.slice(0, Math.max(0, totalCap - head.length))
      claims = [...head, ...rest]
    } else {
      claims = [...landscape, ...fill]
    }
  } else {
    const raw: EvidenceClaim[] = [...coreRaw, ...supportingRaw, ...landscapeClaims]
    claims = dedupeClaimsById(raw)
    if (preferFacetOrder) {
      claims = sortByFacetPriority(claims)
    }
    if (totalCap != null && totalCap >= 0 && claims.length > totalCap) {
      claims = claims.slice(0, totalCap)
    }
  }

  return claims
}

/** Facet / claimType counts for pack completeness gates (AI PR13). */
export function countClaimsByType(
  claims: readonly EvidenceClaim[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of claims) {
    counts[c.claimType] = (counts[c.claimType] ?? 0) + 1
  }
  return counts
}

/** Distinct provenance.source values — evidence breadth chips. */
export function claimSourceNames(claims: readonly EvidenceClaim[]): string[] {
  const sources = new Set<string>()
  for (const c of claims) {
    if (c.provenance?.source) sources.add(c.provenance.source)
  }
  return Array.from(sources).sort()
}

/**
 * M3 citation density: claim has non-empty source + retrievedAt (design v1 metric).
 */
export function isCitableClaim(c: EvidenceClaim): boolean {
  const src = c.provenance?.source?.trim()
  const at = c.provenance?.retrievedAt?.trim()
  return Boolean(src && at)
}

export function countCitableClaims(claims: readonly EvidenceClaim[]): number {
  let n = 0
  for (const c of claims) {
    if (isCitableClaim(c)) n += 1
  }
  return n
}
