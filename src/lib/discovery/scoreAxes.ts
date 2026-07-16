/**
 * Multi-axis scoring formulas (pure).
 * Investigation-priority proxies — never “success probability.”
 * @see docs/design/discovery-workbench-v1.md §5.1.3, §5.3
 */

import {
  clampAxis,
  computeComposite,
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type AeAggressiveness,
  type AxisStatus,
  type SafetyFlag,
  type ScoreRubric,
  type ScoreVector,
} from '../domain/score'

/** Soft-flag: high clinical-stage drugs get a safety floor so FAERS volume alone rarely buries them. */
export const SOFT_FLAG_CLINICAL_STAGE_THRESHOLD = 0.75
export const SOFT_FLAG_SAFETY_FLOOR = 0.45

/** Literature scale: novelty = 1 - min(1, log2(1+hits)/log2(1+10000)) */
export const NOVELTY_HIT_SCALE = 10_000

/** AE volume scale for risk proxy (FAERS term counts). */
export const AE_TOTAL_SCALE = 10_000
export const AE_SERIOUS_SCALE = 1_000
export const RECALL_COUNT_SCALE = 5

export interface CheapAxisInputs {
  /** Open Targets known-drug path (0.9 when true). */
  isKnownDrug?: boolean
  /** DGIdb / gene-disease association proxy 0–1. */
  geneAssociationScore?: number | null
  /** Shared disease-target fraction 0–1. */
  sharedTargetRatio?: number | null
  /** Optional ChEMBL activity proxy 0–1 (e.g. pChEMBL/normalized). */
  chemblActivityTerm?: number | null
  /** Max indication phase 0–4. */
  maxPhase?: number | null
  /** Log-normalized trial volume 0–1. */
  trialNorm?: number | null
  /** Identity trust axis 0–1. */
  identityTrust?: number | null
  /** Source labels (used for known-drug / ChEMBL heuristics). */
  sources?: string[]
}

export interface SafetyHarvestInputs {
  /** Sum of FAERS reaction counts (or total AE reports). */
  aeTotal: number
  /** Serious AE count proxy. */
  seriousTotal?: number
  /** openFDA recall count (recent window). */
  recallCount: number
  /** Whether fetch failed (vs empty). */
  fetchFailed?: boolean
  fetchTimedOut?: boolean
}

export interface NoveltyHarvestInputs {
  hitCount: number
  /** phaseNorm = maxPhase/4; dampen novelty when fully approved. */
  phaseNorm?: number | null
  fetchFailed?: boolean
  fetchTimedOut?: boolean
}

/**
 * efficacy = max(OT known-drug 0.9, DGIdb gene term, shared-target term, ChEMBL activity).
 * Returns null when no supporting signal.
 */
export function scoreEfficacy(input: CheapAxisInputs): number | null {
  const parts: number[] = []
  if (input.isKnownDrug) parts.push(0.9)
  if (input.sources?.some((s) => /open\s*targets/i.test(s) && /known|drug/i.test(s))) {
    parts.push(0.9)
  }
  // Open Targets as disease enrichment source (post-PR3b knownDrugs) is a soft known-drug signal
  if (input.sources?.some((s) => /^open targets$/i.test(s.trim()))) {
    parts.push(0.85)
  }
  // Explicit 0 is a computed signal (no association); undefined/null is missing.
  if (input.geneAssociationScore !== undefined && input.geneAssociationScore !== null) {
    const gene = clampAxis(input.geneAssociationScore)
    if (gene != null) parts.push(gene)
  }
  if (input.sharedTargetRatio !== undefined && input.sharedTargetRatio !== null) {
    const shared = clampAxis(input.sharedTargetRatio)
    if (shared != null) parts.push(shared)
  }
  if (input.chemblActivityTerm !== undefined && input.chemblActivityTerm !== null) {
    const chembl = clampAxis(input.chemblActivityTerm)
    if (chembl != null) parts.push(chembl)
  }
  // Indication phase presence is a weak efficacy proxy when nothing else
  if (parts.length === 0 && (input.maxPhase ?? 0) > 0) {
    parts.push(Math.min(0.5, (input.maxPhase as number) / 8))
  }
  if (parts.length === 0) return null
  return clampAxis(Math.max(...parts))
}

/**
 * clinicalStage = 0.7 * (maxPhase/4) + 0.3 * trialNorm
 */
export function scoreClinicalStage(input: CheapAxisInputs): number | null {
  const maxPhase = input.maxPhase
  const trialNorm = input.trialNorm
  const hasPhase = maxPhase != null && !Number.isNaN(maxPhase) && maxPhase > 0
  const hasTrials = trialNorm != null && !Number.isNaN(trialNorm) && trialNorm > 0
  if (!hasPhase && !hasTrials) {
    // Explicit zero phase + zero trials → computed empty-ish 0 (still "computed")
    if (maxPhase === 0 || trialNorm === 0) return 0
    return null
  }
  const phaseNorm = hasPhase ? Math.min(1, Math.max(0, (maxPhase as number) / 4)) : 0
  const tNorm = hasTrials ? Math.min(1, Math.max(0, trialNorm as number)) : 0
  if (hasPhase && hasTrials) {
    return clampAxis(0.7 * phaseNorm + 0.3 * tNorm)
  }
  if (hasPhase) return clampAxis(phaseNorm)
  return clampAxis(tNorm)
}

/**
 * safety = 1 - risk from AE volume, serious proxy, recalls.
 * Empty AE+recall → null (never “safe”).
 */
export function scoreSafety(input: SafetyHarvestInputs): {
  value: number | null
  status: AxisStatus
  flags: SafetyFlag[]
  risk: number | null
} {
  if (input.fetchTimedOut) {
    return { value: null, status: 'timeout', flags: [], risk: null }
  }
  if (input.fetchFailed) {
    return { value: null, status: 'error', flags: [], risk: null }
  }

  const aeTotal = Math.max(0, input.aeTotal || 0)
  const seriousTotal = Math.max(0, input.seriousTotal ?? 0)
  const recallCount = Math.max(0, input.recallCount || 0)

  if (aeTotal === 0 && seriousTotal === 0 && recallCount === 0) {
    return { value: null, status: 'empty', flags: [], risk: null }
  }

  const aeRisk = Math.min(1, Math.log2(1 + aeTotal) / Math.log2(1 + AE_TOTAL_SCALE))
  const seriousRisk = Math.min(
    1,
    Math.log2(1 + seriousTotal) / Math.log2(1 + AE_SERIOUS_SCALE),
  )
  const recallRisk = Math.min(1, recallCount / RECALL_COUNT_SCALE)
  const risk = 0.5 * aeRisk + 0.3 * seriousRisk + 0.2 * recallRisk
  const value = clampAxis(1 - risk)

  const flags: SafetyFlag[] = []
  if (aeTotal > 50 || aeRisk > 0.35) {
    flags.push({
      kind: 'ae_burden',
      severity: aeRisk > 0.7 ? 'high' : aeRisk > 0.45 ? 'warn' : 'info',
      label: 'AE signal — review FAERS bias',
    })
  }
  if (seriousTotal > 20 || seriousRisk > 0.4) {
    flags.push({
      kind: 'serious_ae',
      severity: seriousRisk > 0.65 ? 'high' : 'warn',
      label: 'Serious AE reports present',
    })
  }
  if (recallCount > 0) {
    flags.push({
      kind: 'recall',
      severity: recallCount >= 3 ? 'high' : 'warn',
      label: `${recallCount} recent recall${recallCount === 1 ? '' : 's'}`,
    })
  }

  return { value, status: 'computed', flags, risk }
}

/**
 * novelty = 1 - min(1, log2(1+hitCount)/log2(1+10000));
 * dampen if approved (phaseNorm ≈ 1).
 */
export function scoreNovelty(input: NoveltyHarvestInputs): {
  value: number | null
  status: AxisStatus
} {
  if (input.fetchTimedOut) return { value: null, status: 'timeout' }
  if (input.fetchFailed) return { value: null, status: 'error' }

  const hits = Math.max(0, input.hitCount || 0)
  let novelty = 1 - Math.min(1, Math.log2(1 + hits) / Math.log2(1 + NOVELTY_HIT_SCALE))
  const phaseNorm = input.phaseNorm
  if (phaseNorm != null && phaseNorm >= 0.95) {
    // Approved-for-disease dampening: well-known drugs are less “novel”
    novelty *= 0.7
  } else if (phaseNorm != null && phaseNorm >= 0.75) {
    novelty *= 0.85
  }
  return { value: clampAxis(novelty), status: 'computed' }
}

/**
 * Apply AE aggressiveness to a raw safety axis before composite.
 * soft-flag: clamp floor for high clinicalStage; hard-penalty: pass through.
 */
export function applyAeAggressiveness(
  safety: number | null,
  clinicalStage: number | null,
  mode: AeAggressiveness,
): number | null {
  if (safety == null) return null
  if (mode === 'hard-penalty') return clampAxis(safety)
  // soft-flag
  if (clinicalStage != null && clinicalStage >= SOFT_FLAG_CLINICAL_STAGE_THRESHOLD) {
    return clampAxis(Math.max(safety, SOFT_FLAG_SAFETY_FLOOR))
  }
  return clampAxis(safety)
}

export interface BuildScoreVectorInput {
  cheap: CheapAxisInputs
  rubric: ScoreRubric
  /** Pre-harvest or harvested safety (raw, before soft floor). */
  safety?: { value: number | null; status: AxisStatus; flags?: SafetyFlag[] }
  novelty?: { value: number | null; status: AxisStatus }
  scorePhase?: ScoreVector['scorePhase']
}

/**
 * Build a full ScoreVector from cheap + optional harvest axes.
 */
export function buildScoreVector(input: BuildScoreVectorInput): ScoreVector {
  const rubric = input.rubric
  const base = createEmptyScoreVector(input.scorePhase ?? 'cheap', rubric)

  const efficacy = scoreEfficacy(input.cheap)
  const clinicalStage = scoreClinicalStage(input.cheap)
  const identityTrust = clampAxis(input.cheap.identityTrust ?? null)

  const safetyRaw = input.safety?.value ?? null
  const safetyStatus: AxisStatus =
    input.safety?.status ?? (input.scorePhase === 'full' ? 'empty' : 'not-retrieved')
  const safetyApplied = applyAeAggressiveness(
    safetyRaw,
    clinicalStage,
    rubric.aeAggressiveness,
  )

  const noveltyValue = input.novelty?.value ?? null
  const noveltyStatus: AxisStatus =
    input.novelty?.status ?? (input.scorePhase === 'full' ? 'empty' : 'not-retrieved')

  const axes: ScoreVector['axes'] = {
    efficacy,
    clinicalStage,
    safety: safetyApplied,
    novelty: noveltyValue,
    identityTrust,
  }

  const axisStatus: ScoreVector['axisStatus'] = {
    efficacy: efficacy != null ? 'computed' : 'empty',
    clinicalStage: clinicalStage != null ? 'computed' : 'empty',
    safety: safetyStatus === 'computed' && safetyApplied == null ? 'empty' : safetyStatus,
    novelty: noveltyStatus,
    identityTrust: identityTrust != null ? 'computed' : 'empty',
  }

  const composite = computeComposite(axes, rubric)
  const flags = input.safety?.flags?.length ? [...input.safety.flags] : undefined

  // If soft-flag and we floored safety, keep flags so UI can badge
  if (
    rubric.aeAggressiveness === 'soft-flag' &&
    safetyRaw != null &&
    safetyApplied != null &&
    safetyApplied > safetyRaw &&
    flags
  ) {
    // already have flags
  }

  return {
    ...base,
    composite,
    axes,
    axisStatus,
    rubricId: rubric.preset,
    weights: { ...rubric.weights },
    scorePhase: input.scorePhase ?? (noveltyValue != null || safetyRaw != null ? 'full' : 'cheap'),
    safetyFlags: flags,
  }
}

/**
 * Recompute composite after patching harvest axes onto an existing vector.
 */
export function mergeHarvestIntoScoreVector(
  existing: ScoreVector,
  rubric: ScoreRubric,
  harvest: {
    safety?: { value: number | null; status: AxisStatus; flags?: SafetyFlag[] }
    novelty?: { value: number | null; status: AxisStatus }
  },
): ScoreVector {
  const clinicalStage = existing.axes.clinicalStage
  const safetyRaw = harvest.safety?.value ?? existing.axes.safety
  const safetyStatus = harvest.safety?.status ?? existing.axisStatus.safety
  const safetyApplied = applyAeAggressiveness(
    safetyRaw,
    clinicalStage,
    rubric.aeAggressiveness,
  )
  const noveltyValue = harvest.novelty?.value ?? existing.axes.novelty
  const noveltyStatus = harvest.novelty?.status ?? existing.axisStatus.novelty

  const axes: ScoreVector['axes'] = {
    ...existing.axes,
    safety: safetyApplied,
    novelty: noveltyValue,
  }
  const axisStatus: ScoreVector['axisStatus'] = {
    ...existing.axisStatus,
    safety: safetyStatus,
    novelty: noveltyStatus,
  }
  const flags = harvest.safety?.flags ?? existing.safetyFlags
  const composite = computeComposite(axes, rubric)

  return {
    ...existing,
    axes,
    axisStatus,
    composite,
    scorePhase: 'full',
    weights: { ...rubric.weights },
    rubricId: rubric.preset,
    safetyFlags: flags,
  }
}

/** Map rubric preset id → full ScoreRubric (with AE mode). */
export function rubricFromPreferences(input: {
  preset: ScoreRubric['preset']
  aeAggressiveness?: AeAggressiveness
  customWeights?: ScoreRubric['weights']
  missingAxisPolicy?: ScoreRubric['missingAxisPolicy']
}): ScoreRubric {
  return createDefaultScoreRubric(input.preset, {
    aeAggressiveness: input.aeAggressiveness,
    weights: input.customWeights,
    missingAxisPolicy: input.missingAxisPolicy,
  })
}
