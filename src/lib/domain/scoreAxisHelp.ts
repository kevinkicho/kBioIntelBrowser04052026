/**
 * Human-facing score axis help + scientific math for tooltips.
 * Investigation priority only — not clinical success probability.
 * Formulas match scoreAxes.ts / score.ts / identity.ts (deterministic).
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
    sources:
      'Europe PMC + multi-source densify breadth (OpenAlex, patents, Semantic Scholar, NIH, BindingDB). Dampened for late-stage drugs.',
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

/**
 * Mathematical / scientific definition of each axis (of-record formulas).
 * Displayed in ScoreMathTooltip — keep in sync with scoreAxes.ts.
 */
export const AXIS_MATH: Record<
  ScoreAxisKey,
  {
    /** One-line formula (math-ish plain text) */
    formula: string
    /** Expanded derivation steps */
    steps: string[]
    /** Units / range note */
    range: string
    /** Scientific interpretation caveat */
    science: string
  }
> = {
  efficacy: {
    formula: 'E = max(s₁, s₂, …)  ∈ [0,1]  or null if no signal',
    steps: [
      's_known = 0.9 if Open Targets known-drug path (or OT source label)',
      's_OT_soft = 0.85 if Open Targets disease enrichment only',
      's_gene = clamp(geneAssociationScore) from DGIdb / disease–gene links',
      's_shared = clamp(sharedTargetRatio) = shared disease targets / relevant set',
      's_chembl = clamp(normalized ChEMBL activity term, e.g. pChEMBL proxy)',
      'If no parts but maxPhase > 0: weak term min(0.5, maxPhase/8)',
      'E = max(parts); null when parts empty (missing ≠ zero efficacy)',
    ],
    range: '0–1 continuous; null = not retrieved / no supporting signal',
    science:
      'Max-pool of independent free-API evidence channels (OR of support). Not a treatment-effect estimate or binding affinity.',
  },
  clinicalStage: {
    formula: 'C = 0.7·(maxPhase/4) + 0.3·trialNorm   (when both present)',
    steps: [
      'phaseNorm = clamp(maxPhase / 4) with maxPhase ∈ {0,1,2,3,4} (preclinical→approved)',
      'trialNorm = log-normalized ClinicalTrials.gov volume for disease–drug match (0–1)',
      'If only phase: C = phaseNorm; if only trials: C = trialNorm',
      'If both maxPhase=0 and trialNorm=0: C = 0 (computed empty-ish)',
      'If neither available: C = null (not-retrieved)',
    ],
    range: '0–1; higher = later human development stage',
    science:
      'Development maturity proxy from public registries. Phase is not efficacy; trial count is not enrollment quality.',
  },
  safety: {
    formula: 'S = 1 − R,   R = 0.5·aeRisk + 0.3·seriousRisk + 0.2·recallRisk',
    steps: [
      'aeRisk = min(1, log₂(1+aeTotal) / log₂(1+10 000))  — FAERS reaction count sum',
      'seriousRisk = min(1, log₂(1+seriousTotal) / log₂(1+1 000))',
      'recallRisk = min(1, recallCount / 5)  — openFDA recalls in window',
      'If aeTotal=seriousTotal=recallCount=0 → S = null, status empty (never “safe”)',
      'Soft-flag mode: for clinicalStage ≥ 0.75 may floor S at 0.45 (flags still show)',
      'Hard-penalty mode: raw S enters composite without floor',
    ],
    range: '0–1 when computed; null = empty/error/timeout (excluded under renormalize)',
    science:
      'Spontaneous reports are not incidence rates. Log compression dampens mega-popular drugs without claiming causal risk.',
  },
  novelty: {
    formula: 'N = (1 − min(1, log₂(1+H)/log₂(1+10 000))) · d(phase)',
    steps: [
      'H = literature hit proxy (Europe PMC count, plus densify breadth: OpenAlex×25, Semantic Scholar×20, patents×8, NIH grants×15, BindingDB×5; max of prior and breadth)',
      'base = 1 − min(1, log₂(1+H) / log₂(1+10 000))  — inverse literature saturation',
      'd(phase): if phaseNorm ≥ 0.95 → ×0.70; if ≥ 0.75 → ×0.85; else ×1',
      'phaseNorm ≈ clinicalStage or maxPhase/4 when available',
      'Timeout/error → N = null (not zero novelty)',
    ],
    range: '0–1; higher = less crowded public literature (more “white space”)',
    science:
      'Bibliometric inverse density, not chemical novelty or IP freedom-to-operate. Multi-source H reduces single-database bias.',
  },
  identityTrust: {
    formula: 'I ∈ {1.0, 0.66, 0.33, 0} from discrete identity ladder',
    steps: [
      'high (1.0): valid InChIKey present',
      'medium (0.66): PubChem CID and/or ChEMBL id without structure key',
      'low (0.33): name+SMILES only, or name+alternate CIDs only',
      'unresolved (0): name-only or no usable keys',
      'Axis maps assessIdentityTrust().axisValue after PubChem resolve',
    ],
    range: 'Discrete levels mapped to [0,1]',
    science:
      'Structure/xref resolution confidence for reproducible joins — not compound quality or purity.',
  },
}

export const COMPOSITE_MATH = {
  formula:
    'Composite = Σᵢ (wᵢ · vᵢ) / Σᵢ wᵢ   over included axes i',
  steps: [
    'Each axis value vᵢ ∈ [0,1] or missing (null)',
    'Weights wᵢ from rubric preset (balanced / repurposing / novel-bioactive / safety-first) or custom sliders; Σ w ≈ 1',
    'renormalize (default): skip null axes; divide by sum of weights of present axes only',
    'penalize: null axes use v = penalizeValue (default 0.3) and keep their weight',
    'Composite ∈ [0,1]; displayed as percent. Deterministic — no LLM in rank path',
  ],
  range: '0–1 investigation priority (not success probability)',
  science:
    'Linear weighted mean of free-API proxies. Changing weights reorders candidates without inventing evidence.',
  disclaimer:
    'Investigation priority only — not a prediction of clinical success. Empty safety ≠ safe. Ranking is deterministic (no LLM).',
} as const

/** Disease–gene association score (Open Targets / DisGeNET style 0–1). */
export const GENE_ASSOC_MATH = {
  formula: 'g ∈ [0,1] from source association score (passthrough, clamped)',
  steps: [
    'Open Targets: disease–target overall association score when available',
    'DisGeNET / other free sources: published gene–disease score when available',
    'Used as s_gene inside efficacy max-pool and shown on Discover gene table',
    'Not a GWAS p-value and not causal certainty',
  ],
  range: 'Typically 0–1 as published by the free API',
  science:
    'Source-native association strength. Higher = stronger public disease–target link in that database’s metric.',
  disclaimer: 'Association ≠ therapeutic target validation. Verify in primary genetics sources.',
} as const

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
    footnote: COMPOSITE_MATH.disclaimer,
  }
}

/** Structured math panel payload for ScoreMathTooltip. */
export interface ScoreMathPanel {
  title: string
  valueLine?: string
  formula: string
  steps: string[]
  range: string
  science: string
  statusLine?: string
  contributionLine?: string
  disclaimer: string
}

export function buildAxisMathPanel(
  key: ScoreAxisKey,
  scores?: ScoreVector | null,
  rubric?: ScoreRubric,
): ScoreMathPanel {
  const help = AXIS_HELP[key]
  const math = AXIS_MATH[key]
  let valueLine: string | undefined
  let contributionLine: string | undefined
  let statusLine: string | undefined

  if (scores) {
    const expl = explainScoreContributions(
      scores,
      rubric ??
        createDefaultScoreRubric('balanced', {
          weights: scores.weights ?? createDefaultScoreRubric('balanced').weights,
        }),
    )
    const row = expl.axes.find((a) => a.key === key)
    const v = row?.value == null ? '—' : `${Math.round(row.value * 100)}%`
    const w = row ? `${Math.round(row.weight * 100)}% weight` : ''
    const share =
      row?.shareOfComposite != null
        ? ` · ~${Math.round(row.shareOfComposite * 100)}% of composite`
        : row && !row.included
          ? ' · excluded from composite (missing)'
          : ''
    valueLine = `${AXIS_LABELS[key]} = ${v} (${w}${share})`
    contributionLine =
      row?.weightedTerm != null
        ? `Weighted term w·v = ${(row.weightedTerm).toFixed(3)}`
        : undefined
    statusLine = `Status: ${axisStatusHelp(scores.axisStatus[key])}`
  }

  return {
    title: AXIS_LABELS[key],
    valueLine,
    formula: math.formula,
    steps: math.steps,
    range: math.range,
    science: math.science,
    statusLine,
    contributionLine,
    disclaimer: [
      help.summary,
      `Sources: ${help.sources}`,
      `↑ ${help.highMeans}`,
      `↓ ${help.lowMeans}`,
      COMPOSITE_MATH.disclaimer,
    ].join(' '),
  }
}

export function buildCompositeMathPanel(
  scores?: ScoreVector | null,
  rubric?: ScoreRubric,
): ScoreMathPanel {
  const expl = scores
    ? explainScoreContributions(scores, rubric)
    : null
  const valueLine = expl
    ? `Composite = ${Math.round(expl.composite * 100)}%${
        scores?.scorePhase ? ` · phase ${scores.scorePhase}` : ''
      }${scores?.rubricId ? ` · ${scores.rubricId}` : ''}`
    : 'Composite = weighted mean of available axes'

  const steps = [
    ...COMPOSITE_MATH.steps,
    ...(expl
      ? expl.axes
          .filter((a) => a.included)
          .map((a) => {
            const v = a.value == null ? 'miss' : `${Math.round(a.value * 100)}%`
            const sh =
              a.shareOfComposite != null
                ? `${Math.round(a.shareOfComposite * 100)}%`
                : '—'
            return `${a.label}: ${v} × w=${Math.round(a.weight * 100)}% → ${sh} of total`
          })
      : []),
  ]

  return {
    title: 'Composite score',
    valueLine,
    formula: COMPOSITE_MATH.formula,
    steps,
    range: COMPOSITE_MATH.range,
    science: COMPOSITE_MATH.science,
    statusLine: expl?.policy,
    disclaimer: COMPOSITE_MATH.disclaimer,
  }
}

export function buildGeneAssocMathPanel(score?: number | null): ScoreMathPanel {
  return {
    title: 'Gene–disease association score',
    valueLine:
      score != null && !Number.isNaN(score)
        ? `g = ${score.toFixed(3)} (${Math.round(score * 100)}%)`
        : undefined,
    formula: GENE_ASSOC_MATH.formula,
    steps: [...GENE_ASSOC_MATH.steps],
    range: GENE_ASSOC_MATH.range,
    science: GENE_ASSOC_MATH.science,
    disclaimer: GENE_ASSOC_MATH.disclaimer,
  }
}

/** Multi-line plain text for a11y / compact tooltips. */
export function formatAxisTooltip(
  key: ScoreAxisKey,
  scores: ScoreVector,
  rubric?: ScoreRubric,
): string {
  const panel = buildAxisMathPanel(key, scores, rubric)
  return [
    panel.valueLine || panel.title,
    `Formula: ${panel.formula}`,
    ...panel.steps.map((s) => `· ${s}`),
    `Range: ${panel.range}`,
    panel.science,
    panel.statusLine,
    panel.contributionLine,
    panel.disclaimer,
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatCompositeTooltip(
  scores: ScoreVector,
  rubric?: ScoreRubric,
): string {
  const panel = buildCompositeMathPanel(scores, rubric)
  return [
    panel.valueLine || panel.title,
    `Formula: ${panel.formula}`,
    ...panel.steps.map((s) => `· ${s}`),
    `Range: ${panel.range}`,
    panel.science,
    panel.statusLine,
    panel.disclaimer,
  ]
    .filter(Boolean)
    .join('\n')
}

export function formatGeneAssocTooltip(score?: number | null): string {
  const panel = buildGeneAssocMathPanel(score)
  return [
    panel.valueLine || panel.title,
    `Formula: ${panel.formula}`,
    ...panel.steps.map((s) => `· ${s}`),
    `Range: ${panel.range}`,
    panel.science,
    panel.disclaimer,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Static composite tip when no ScoreVector is attached (legacy %). */
export function formatCompositeMathOnly(score?: number | null): string {
  const pct =
    score != null && !Number.isNaN(score) ? `${Math.round(score * 100)}%` : undefined
  return [
    pct ? `Composite ≈ ${pct}` : 'Composite score',
    `Formula: ${COMPOSITE_MATH.formula}`,
    ...COMPOSITE_MATH.steps.map((s) => `· ${s}`),
    COMPOSITE_MATH.science,
    COMPOSITE_MATH.disclaimer,
  ].join('\n')
}
