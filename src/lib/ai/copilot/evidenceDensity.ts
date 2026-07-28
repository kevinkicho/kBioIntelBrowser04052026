/**
 * Evidence density / grounding stats for meaningful AI work.
 * Fail closed on deep synthesis when free-API bags are thin.
 */

import type { CategoryId } from '@/lib/categoryConfig'
import type { MoleculeContext } from './context/types'
import type { RetrievalSnapshot } from '@/lib/ai/copilot/retrieval'
import type { PromptMode } from './prompts/types'

/** Core categories that must be loaded before deep synthesis. */
export const CORE_SYNTHESIS_CATEGORIES: readonly CategoryId[] = [
  'clinical-safety',
  'bioactivity-targets',
  'molecular-chemical',
] as const

/** Deep essay-style modes that need dense evidence. */
export const DEEP_SYNTHESIS_MODES = new Set<PromptMode>([
  'auto_insight',
  'executive_brief',
  'safety_deep_dive',
  'mechanism_analysis',
  'therapeutic_hypothesis',
  'competitive_position',
  'repurposing_scan',
  'cross_molecule_compare',
])

/** Task modes that can run on thinner evidence (artifacts, not essays). */
export const LIGHT_TASK_MODES = new Set<PromptMode>([
  'prior_art_query',
  'suggest_next',
  'gap_analysis',
  'hypothesis_seed',
  'differential_safety',
  'safety_memo',
  'next_actions',
  'free_qa',
  'followup',
])

export interface EvidenceGroundingStats {
  panelsWithData: number
  panelsTotal: number
  completenessRatio: number
  trialCount: number
  activityCount: number
  aeCount: number
  mechanismCount: number
  indicationCount: number
  literatureCount: number
  publicationSampleCount: number
  /** Named evidence rows useful for grounding (approx) */
  namedEvidenceRows: number
  coreCategoriesLoaded: number
  coreCategoriesTotal: number
  missingCore: CategoryId[]
  /** True when deep synthesis is allowed */
  canDeepSynthesize: boolean
  /** True when light tasks (prior-art, next actions) are useful */
  canRunLightTasks: boolean
  /** One-line badge for UI */
  badgeLine: string
  /** Why deep synthesis is blocked */
  blockReason?: string
}

export interface DensityThresholds {
  minPanelsWithData: number
  minCompletenessRatio: number
  minNamedEvidenceRows: number
  minCoreCategories: number
}

export const DEFAULT_DEEP_THRESHOLDS: DensityThresholds = {
  minPanelsWithData: 8,
  minCompletenessRatio: 0.2,
  minNamedEvidenceRows: 12,
  minCoreCategories: 2,
}

export const LIGHT_THRESHOLDS: DensityThresholds = {
  minPanelsWithData: 2,
  minCompletenessRatio: 0.05,
  minNamedEvidenceRows: 2,
  minCoreCategories: 0,
}

function countNamed(ctx: MoleculeContext): number {
  const r = ctx.rich
  return (
    r.topTargetActivities.length +
    r.mechanismDetails.length +
    r.trialDetails.length +
    r.topAdverseEvents.length +
    r.indicationDetails.length +
    r.publicationDetails.length +
    r.diseaseAssociations.length +
    r.patentDetails.length
  )
}

export function computeEvidenceGrounding(
  ctx: MoleculeContext,
  snapshot: RetrievalSnapshot,
  categoryStatus?: Partial<Record<CategoryId, string>>,
  thresholds: DensityThresholds = DEFAULT_DEEP_THRESHOLDS,
): EvidenceGroundingStats {
  const panelsWithData = snapshot.totalApisSucceeded ?? ctx.dataCompleteness.panelsWithData ?? 0
  const panelsTotal = Math.max(1, snapshot.totalApisCalled || ctx.dataCompleteness.totalPanels || 1)
  const completenessRatio = panelsWithData / panelsTotal

  let coreLoaded = 0
  const missingCore: CategoryId[] = []
  for (const cat of CORE_SYNTHESIS_CATEGORIES) {
    const st = categoryStatus?.[cat]
    if (st === 'loaded') coreLoaded++
    else missingCore.push(cat)
  }
  // Fallback: if status map missing, infer from panels
  if (!categoryStatus) {
    coreLoaded = panelsWithData >= 4 ? 2 : panelsWithData >= 2 ? 1 : 0
  }

  const namedEvidenceRows = countNamed(ctx)
  const trialCount = ctx.clinical.totalTrials
  const activityCount = ctx.biological.bioactivityCount
  const aeCount = ctx.safety.adverseEventCount
  const mechanismCount = ctx.rich.mechanismDetails.length
  const indicationCount = ctx.rich.indicationDetails.length
  const literatureCount = ctx.research.publicationCount
  const publicationSampleCount = ctx.rich.publicationDetails.length

  const canDeepSynthesize =
    panelsWithData >= thresholds.minPanelsWithData &&
    completenessRatio >= thresholds.minCompletenessRatio &&
    namedEvidenceRows >= thresholds.minNamedEvidenceRows &&
    coreLoaded >= thresholds.minCoreCategories

  const canRunLightTasks =
    panelsWithData >= LIGHT_THRESHOLDS.minPanelsWithData ||
    namedEvidenceRows >= LIGHT_THRESHOLDS.minNamedEvidenceRows ||
    Boolean(ctx.identity.name)

  let blockReason: string | undefined
  if (!canDeepSynthesize) {
    const parts: string[] = []
    if (panelsWithData < thresholds.minPanelsWithData) {
      parts.push(`only ${panelsWithData}/${thresholds.minPanelsWithData} panels with data`)
    }
    if (namedEvidenceRows < thresholds.minNamedEvidenceRows) {
      parts.push(`only ${namedEvidenceRows} named evidence rows (need ${thresholds.minNamedEvidenceRows})`)
    }
    if (coreLoaded < thresholds.minCoreCategories && missingCore.length) {
      parts.push(`load Core: ${missingCore.join(', ')}`)
    }
    blockReason = parts.join('; ') || 'evidence too thin for deep synthesis'
  }

  const badgeLine = [
    `${panelsWithData} panels`,
    `${trialCount} trials`,
    `${activityCount} activities`,
    `${aeCount} AE rows`,
    `${mechanismCount} MoA`,
    `${namedEvidenceRows} named rows`,
  ].join(' · ')

  return {
    panelsWithData,
    panelsTotal,
    completenessRatio,
    trialCount,
    activityCount,
    aeCount,
    mechanismCount,
    indicationCount,
    literatureCount,
    publicationSampleCount,
    namedEvidenceRows,
    coreCategoriesLoaded: coreLoaded,
    coreCategoriesTotal: CORE_SYNTHESIS_CATEGORIES.length,
    missingCore,
    canDeepSynthesize,
    canRunLightTasks,
    badgeLine,
    blockReason,
  }
}

export function modeRequiresDeepDensity(mode: PromptMode): boolean {
  return DEEP_SYNTHESIS_MODES.has(mode)
}

export function buildFailClosedMessage(
  grounding: EvidenceGroundingStats,
  mode: PromptMode,
): string {
  const load = grounding.missingCore.length
    ? `Load Core categories first: ${grounding.missingCore.join(', ')} (Monitor tab → Load).`
    : 'Wait for more free-API panels to finish loading, or open Monitor to retry gaps.'
  return [
    `Insufficient evidence for "${mode.replace(/_/g, ' ')}" — refusing deep synthesis.`,
    `Grounding: ${grounding.badgeLine}.`,
    grounding.blockReason ? `Why: ${grounding.blockReason}.` : '',
    load,
    'Use job tasks instead (Prior-art query, Safety memo, Next actions) — they work on thinner bags and produce copyable artifacts.',
    'Not clinical decision support. Of-record facts stay in the Data hub.',
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatGroundingForPrompt(g: EvidenceGroundingStats): string {
  return [
    `EVIDENCE GROUNDING (session samples, not universe counts):`,
    `- ${g.badgeLine}`,
    `- Core categories loaded: ${g.coreCategoriesLoaded}/${g.coreCategoriesTotal}`,
    g.canDeepSynthesize
      ? '- Density gate: PASS for cautious synthesis'
      : `- Density gate: FAIL — ${g.blockReason}`,
    'Cite only named rows and panel keys below. If a domain has zero named rows, say so — do not invent.',
  ].join('\n')
}
