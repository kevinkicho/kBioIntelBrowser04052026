/**
 * Multi-axis scoring types and defaults.
 * @see docs/design/discovery-workbench-v1.md §3.1, §5.3
 */

export type ScorePhase = 'cheap' | 'full'

export type ScoreAxisKey =
  | 'efficacy'
  | 'clinicalStage'
  | 'safety'
  | 'novelty'
  | 'identityTrust'

/** Axis epistemic status (includes 'computed' when a numeric value is present). */
export type AxisStatus =
  | 'supported'
  | 'empty'
  | 'error'
  | 'timeout'
  | 'disabled'
  | 'not-retrieved'
  | 'computed'

export type RubricPresetId = 'balanced' | 'repurposing' | 'novel-bioactive' | 'safety-first'

export type MissingAxisPolicy = 'renormalize' | 'penalize'

export type AeAggressiveness = 'soft-flag' | 'hard-penalty'

export interface ScoreAxisWeights {
  efficacy: number
  clinicalStage: number
  safety: number
  novelty: number
  identityTrust: number
}

export interface ScoreRubric {
  version: 1
  weights: ScoreAxisWeights
  missingAxisPolicy: MissingAxisPolicy
  /** Used when missingAxisPolicy === 'penalize'; default 0.3 */
  penalizeValue?: number
  preset: RubricPresetId
  /** From discovery prefs — how AE affects ranking */
  aeAggressiveness: AeAggressiveness
}

export type SafetyFlagKind = 'ae_burden' | 'recall' | 'serious_ae'
export type SafetyFlagSeverity = 'info' | 'warn' | 'high'

export interface SafetyFlag {
  kind: SafetyFlagKind
  severity: SafetyFlagSeverity
  label: string
}

/**
 * Score vector on a molecule candidate.
 * Axis values are 0–1 or null when not yet computed / empty.
 * Use axisStatus for epistemic / missing reason (not a separate missingReason field).
 */
export interface ScoreVector {
  /** Weighted composite (overall score) over available axes */
  composite: number
  axes: {
    efficacy: number | null
    clinicalStage: number | null
    safety: number | null
    novelty: number | null
    identityTrust: number | null
  }
  axisStatus: {
    efficacy: AxisStatus
    clinicalStage: AxisStatus
    safety: AxisStatus
    novelty: AxisStatus
    identityTrust: AxisStatus
  }
  rubricVersion: 1
  /** Optional rubric id / preset used for this score (wire convenience) */
  rubricId?: RubricPresetId | string
  /** Echo weights used (reproducibility) */
  weights?: ScoreAxisWeights
  scorePhase: ScorePhase
  /** Soft-flag path may attach non-scoring markers */
  safetyFlags?: SafetyFlag[]
}

/** @deprecated Prefer ScoreVector.composite — alias for wire docs that say overallScore */
export type OverallScore = ScoreVector['composite']

export const RUBRIC_PRESETS: Record<RubricPresetId, ScoreAxisWeights> = {
  balanced: {
    efficacy: 0.3,
    clinicalStage: 0.25,
    safety: 0.25,
    novelty: 0.1,
    identityTrust: 0.1,
  },
  repurposing: {
    efficacy: 0.2,
    clinicalStage: 0.35,
    safety: 0.3,
    novelty: 0.05,
    identityTrust: 0.1,
  },
  'novel-bioactive': {
    efficacy: 0.4,
    clinicalStage: 0.1,
    safety: 0.15,
    novelty: 0.25,
    identityTrust: 0.1,
  },
  'safety-first': {
    efficacy: 0.2,
    clinicalStage: 0.15,
    safety: 0.45,
    novelty: 0.05,
    identityTrust: 0.15,
  },
}

export const DEFAULT_PENALIZE_VALUE = 0.3

export function createDefaultScoreRubric(
  preset: RubricPresetId = 'balanced',
  overrides?: Partial<Pick<ScoreRubric, 'aeAggressiveness' | 'missingAxisPolicy' | 'penalizeValue' | 'weights'>>,
): ScoreRubric {
  const isSafetyFirst = preset === 'safety-first'
  return {
    version: 1,
    weights: overrides?.weights ?? { ...RUBRIC_PRESETS[preset] },
    missingAxisPolicy:
      overrides?.missingAxisPolicy ?? (isSafetyFirst ? 'penalize' : 'renormalize'),
    penalizeValue: overrides?.penalizeValue ?? DEFAULT_PENALIZE_VALUE,
    preset,
    aeAggressiveness: overrides?.aeAggressiveness ?? 'soft-flag',
  }
}

/** Empty / pre-score vector: cheap axes not-retrieved, expensive not-retrieved. */
export function createEmptyScoreVector(
  phase: ScorePhase = 'cheap',
  rubric?: Pick<ScoreRubric, 'preset' | 'weights'>,
): ScoreVector {
  return {
    composite: 0,
    axes: {
      efficacy: null,
      clinicalStage: null,
      safety: null,
      novelty: null,
      identityTrust: null,
    },
    axisStatus: {
      efficacy: 'not-retrieved',
      clinicalStage: 'not-retrieved',
      safety: 'not-retrieved',
      novelty: 'not-retrieved',
      identityTrust: 'not-retrieved',
    },
    rubricVersion: 1,
    rubricId: rubric?.preset,
    weights: rubric?.weights ? { ...rubric.weights } : undefined,
    scorePhase: phase,
  }
}

/**
 * Clamp axis to [0,1] or pass null through.
 */
export function clampAxis(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/**
 * Compute composite from axes + rubric.
 * - renormalize: weighted sum over non-null axes only (weights re-normalized)
 * - penalize: null axes contribute penalizeValue
 */
export function computeComposite(
  axes: ScoreVector['axes'],
  rubric: Pick<ScoreRubric, 'weights' | 'missingAxisPolicy' | 'penalizeValue'>,
): number {
  const keys = Object.keys(rubric.weights) as ScoreAxisKey[]
  let weighted = 0
  let weightSum = 0
  const penalty = rubric.penalizeValue ?? DEFAULT_PENALIZE_VALUE

  for (const key of keys) {
    const w = rubric.weights[key]
    if (w <= 0) continue
    const raw = axes[key]
    if (raw == null) {
      if (rubric.missingAxisPolicy === 'penalize') {
        weighted += w * penalty
        weightSum += w
      }
      // renormalize: skip
      continue
    }
    const v = clampAxis(raw) ?? 0
    weighted += w * v
    weightSum += w
  }

  if (weightSum <= 0) return 0
  return weighted / weightSum
}
