/**
 * Human-facing score axis help + contribution math for tooltips.
 * Investigation priority only — not clinical success probability.
 */

import type {
  AxisStatus,
  ScoreAxisKey,
  ScoreAxisWeights,
  ScoreRubric,
  ScoreVector,
} from './score'
import { AXIS_LABELS, AXIS_ORDER } from '@/lib/profileMode'
import { computeComposite, createDefaultScoreRubric } from './score'

/** What each axis measures (short, user-facing). */
export const AXIS_HELP: Record<
  ScoreAxisKey,
  { summary: string; sources: string; highMeans: string; lowMeans: string }
> = {
  clinicalStage: {
    summary: 'How far this molecule has advanced in human development (phase / approval proxy).',
    sources: 'ChEMBL max phase, ClinicalTrials.gov volume, Open Targets known-drug path.',
    highMeans: 'Approved or late clinical — more human experience, less “new chemical” risk.',
    lowMeans: 'Preclinical / early or unknown — higher investigation uncertainty on human use.',
  },
  efficacy: {
    summary: 'Proxy for target/disease support and known pharmacology — not a cure prediction.',
    sources: 'Open Targets known drugs, DGIdb, shared disease–target links, ChEMBL activity.',
    highMeans: 'Strong public evidence of disease/target linkage or known-drug status.',
    lowMeans: 'Weak or missing linkage in free public sources (not proof of inactivity).',
  },
  safety: {
    summary: 'AE / recall burden proxy from free public safety feeds. Empty ≠ safe.',
    sources: 'openFDA FAERS counts, recalls. Soft flags may show without hard score penalty.',
    highMeans: 'Lower relative AE/recall burden in harvested data (or soft floor for late-stage).',
    lowMeans: 'Higher AE volume or recalls — investigate labels before promoting.',
  },
  novelty: {
    summary: 'Literature saturation inverse: more papers → lower novelty score.',
    sources: 'Europe PMC / literature hit counts (harvested). Dampened for fully approved drugs.',
    highMeans: 'Fewer public publications — more “white space,” less prior art.',
    lowMeans: 'Crowded literature — still useful as tool compounds, less first-in-class story.',
  },
  identityTrust: {
    summary: 'Confidence that the structure ID is resolved (CID / InChIKey / ChEMBL).',
    sources: 'PubChem CID, InChIKey, ChEMBL id crosswalks.',
    highMeans: 'Stable structure identifiers — safe for board triage and packs.',
    lowMeans: 'Name-only or unresolved — fix identity before trusting deep evidence.',
  },
}

export function axisStatusHelp(status: AxisStatus | undefined): string {
  switch (status) {
    case 'computed':
    case 'supported':
      return 'Value computed from retrieved public data.'
    case 'empty':
      return 'Source returned empty — no data found (not the same as a zero score).'
    case 'error':
      return 'Fetch error — axis not used as zero; re-run harvest or open the panel.'
    case 'timeout':
      return 'Timed out — try again or open the molecule profile.'
    case 'disabled':
      return 'Axis disabled for this run.'
    case 'not-retrieved':
    default:
      return 'Not retrieved yet (e.g. safety/novelty often fill after board harvest).'
  }
}

export interface AxisContribution {
  key: ScoreAxisKey
  label: string
  value: number | null
  weight: number
  /** Contribution to composite before renormalization share (w * v or penalty) */
  weightedTerm: number | null
  /** Share of final composite attribution 0–1 when included */
  shareOfComposite: number | null
  status: AxisStatus
  included: boolean
}

/**
 * Explain how composite is built from current axes + weights.
 */
export function explainScoreContributions(
  scores: ScoreVector,
  rubric?: Pick<ScoreRubric, 'weights' | 'missingAxisPolicy' | 'penalizeValue' | 'preset'>,
): {
  composite: number
  policy: string
  axes: AxisContribution[]
  footnote: string
} {
  const r = rubric ?? {
    weights: scores.weights ?? createDefaultScoreRubric('balanced').weights,
    missingAxisPolicy: 'renormalize' as const,
    penalizeValue: 0.3,
    preset: (scores.rubricId as ScoreRubric['preset']) ?? 'balanced',
  }
  const weights: ScoreAxisWeights = r.weights
  const penalty = r.penalizeValue ?? 0.3
  const composite = scores.composite ?? computeComposite(scores.axes, r)

  let weightSum = 0
  const terms: { key: ScoreAxisKey; term: number; included: boolean }[] = []

  for (const key of AXIS_ORDER) {
    const w = weights[key] ?? 0
    if (w <= 0) {
      terms.push({ key, term: 0, included: false })
      continue
    }
    const raw = scores.axes[key]
    if (raw == null) {
      if (r.missingAxisPolicy === 'penalize') {
        terms.push({ key, term: w * penalty, included: true })
        weightSum += w
      } else {
        terms.push({ key, term: 0, included: false })
      }
      continue
    }
    terms.push({ key, term: w * raw, included: true })
    weightSum += w
  }

  const axes: AxisContribution[] = terms.map(({ key, term, included }) => {
    const w = weights[key] ?? 0
    return {
      key,
      label: AXIS_LABELS[key],
      value: scores.axes[key],
      weight: w,
      weightedTerm: included ? term : null,
      shareOfComposite: included && weightSum > 0 ? term / weightSum : null,
      status: scores.axisStatus[key],
      included,
    }
  })

  const policy =
    r.missingAxisPolicy === 'penalize'
      ? `Missing axes contribute a penalty (${Math.round(penalty * 100)}%) and stay in the weight sum.`
      : 'Missing axes are skipped and remaining weights renormalize (not treated as zero).'

  return {
    composite,
    policy,
    axes,
    footnote:
      'Investigation priority only — not a prediction of clinical success. Empty safety ≠ safe. Ranking is deterministic (no LLM).',
  }
}

/** Multi-line title attribute for an axis row. */
export function formatAxisTooltip(
  key: ScoreAxisKey,
  scores: ScoreVector,
  rubric?: ScoreRubric,
): string {
  const help = AXIS_HELP[key]
  const expl = explainScoreContributions(
    scores,
    rubric ?? createDefaultScoreRubric('balanced', {
      weights: scores.weights ?? createDefaultScoreRubric('balanced').weights,
    }),
  )
  const row = expl.axes.find((a) => a.key === key)
  const v =
    row?.value == null ? '—' : `${Math.round(row.value * 100)}%`
  const w = row ? `${Math.round(row.weight * 100)}% weight` : ''
  const share =
    row?.shareOfComposite != null
      ? ` · ~${Math.round(row.shareOfComposite * 100)}% of composite`
      : row && !row.included
        ? ' · excluded from composite (missing)'
        : ''
  return [
    `${AXIS_LABELS[key]}: ${v} (${w}${share})`,
    help.summary,
    `Sources: ${help.sources}`,
    `High: ${help.highMeans}`,
    `Low: ${help.lowMeans}`,
    `Status: ${axisStatusHelp(scores.axisStatus[key])}`,
  ].join('\n')
}

export function formatCompositeTooltip(
  scores: ScoreVector,
  rubric?: ScoreRubric,
): string {
  const expl = explainScoreContributions(scores, rubric)
  const lines = [
    `Composite: ${Math.round(expl.composite * 100)}% (${scores.scorePhase}${scores.rubricId ? ` · ${scores.rubricId}` : ''})`,
    expl.policy,
    ...expl.axes
      .filter((a) => a.included)
      .map((a) => {
        const v = a.value == null ? 'miss' : `${Math.round(a.value * 100)}%`
        const sh =
          a.shareOfComposite != null ? `${Math.round(a.shareOfComposite * 100)}%` : '—'
        return `· ${a.label}: ${v} × ${Math.round(a.weight * 100)}% → ${sh} of total`
      }),
    expl.footnote,
  ]
  return lines.join('\n')
}
