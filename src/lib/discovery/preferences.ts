/**
 * Discovery preferences — types, pure parse/merge, localStorage I/O.
 * Storage key: biointel-discovery-prefs-v1
 * @see docs/design/discovery-workbench-v1.md §5.3.1, KD21
 */

import {
  RUBRIC_PRESETS,
  createDefaultScoreRubric,
  type RubricPresetId,
  type ScoreAxisWeights,
  type ScoreRubric,
} from '../domain/score'

export type HarvestTimingPref = 'board-promote' | 'rank-time'
export type AeAggressivenessPref = 'soft-flag' | 'hard-penalty'
export type TourExampleSetPref = 'mixed' | 'common-only' | 'rare-only'
export type CollaborationModePref = 'solo-export' | 'share-links-when-available'

export const DISCOVERY_PREFS_STORAGE_KEY = 'biointel-discovery-prefs-v1'

export interface DiscoveryPreferences {
  version: 1
  rubricPreset: RubricPresetId
  aeAggressiveness: AeAggressivenessPref
  harvestTiming: HarvestTimingPref
  /** Sticky: remember harvestTiming across sessions when true */
  harvestTimingSticky: boolean
  tourExampleSet: TourExampleSetPref
  collaborationMode: CollaborationModePref
  /**
   * When true, after disease confirm try Orphanet gene associations and
   * merge into pinned targets (rare-disease beachhead stretch).
   */
  rareDiseaseBoost: boolean
  /** Optional custom weights; when set, preset shows as "Custom" until reset */
  customWeights?: ScoreAxisWeights
  updatedAt: string
}

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = {
  version: 1,
  rubricPreset: 'balanced',
  aeAggressiveness: 'soft-flag',
  harvestTiming: 'board-promote',
  harvestTimingSticky: true,
  tourExampleSet: 'mixed',
  collaborationMode: 'solo-export',
  rareDiseaseBoost: false,
  updatedAt: new Date(0).toISOString(),
}

/** Fields snapshotted onto DiscoveryResult / board export for reproducibility. */
export type DiscoveryPreferencesSnapshot = Pick<
  DiscoveryPreferences,
  'rubricPreset' | 'aeAggressiveness' | 'harvestTiming'
>

export function snapshotDiscoveryPreferences(
  prefs: DiscoveryPreferences,
): DiscoveryPreferencesSnapshot {
  return {
    rubricPreset: prefs.rubricPreset,
    aeAggressiveness: prefs.aeAggressiveness,
    harvestTiming: prefs.harvestTiming,
  }
}

const RUBRIC_PRESET_IDS = new Set<string>(Object.keys(RUBRIC_PRESETS))
const AE_MODES = new Set(['soft-flag', 'hard-penalty'])
const HARVEST_TIMINGS = new Set(['board-promote', 'rank-time'])
const TOUR_SETS = new Set(['mixed', 'common-only', 'rare-only'])
const COLLAB_MODES = new Set(['solo-export', 'share-links-when-available'])

function isScoreAxisWeights(v: unknown): v is ScoreAxisWeights {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const keys = ['efficacy', 'clinicalStage', 'safety', 'novelty', 'identityTrust'] as const
  return keys.every((k) => typeof o[k] === 'number' && Number.isFinite(o[k] as number))
}

/**
 * Pure: parse unknown JSON into DiscoveryPreferences (merge with defaults).
 * Never throws.
 */
export function parseDiscoveryPreferences(raw: unknown): DiscoveryPreferences {
  const base = { ...DEFAULT_DISCOVERY_PREFERENCES }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>

  const rubricPreset =
    typeof o.rubricPreset === 'string' && RUBRIC_PRESET_IDS.has(o.rubricPreset)
      ? (o.rubricPreset as RubricPresetId)
      : base.rubricPreset

  const aeAggressiveness =
    typeof o.aeAggressiveness === 'string' && AE_MODES.has(o.aeAggressiveness)
      ? (o.aeAggressiveness as AeAggressivenessPref)
      : base.aeAggressiveness

  const harvestTiming =
    typeof o.harvestTiming === 'string' && HARVEST_TIMINGS.has(o.harvestTiming)
      ? (o.harvestTiming as HarvestTimingPref)
      : base.harvestTiming

  const harvestTimingSticky =
    typeof o.harvestTimingSticky === 'boolean'
      ? o.harvestTimingSticky
      : base.harvestTimingSticky

  const tourExampleSet =
    typeof o.tourExampleSet === 'string' && TOUR_SETS.has(o.tourExampleSet)
      ? (o.tourExampleSet as TourExampleSetPref)
      : base.tourExampleSet

  const collaborationMode =
    typeof o.collaborationMode === 'string' && COLLAB_MODES.has(o.collaborationMode)
      ? (o.collaborationMode as CollaborationModePref)
      : base.collaborationMode

  const rareDiseaseBoost =
    typeof o.rareDiseaseBoost === 'boolean' ? o.rareDiseaseBoost : base.rareDiseaseBoost

  const customWeights = isScoreAxisWeights(o.customWeights)
    ? { ...o.customWeights }
    : undefined

  const updatedAt =
    typeof o.updatedAt === 'string' && o.updatedAt.length > 0
      ? o.updatedAt
      : new Date().toISOString()

  return {
    version: 1,
    rubricPreset,
    aeAggressiveness,
    harvestTiming,
    harvestTimingSticky,
    tourExampleSet,
    collaborationMode,
    rareDiseaseBoost,
    ...(customWeights ? { customWeights } : {}),
    updatedAt,
  }
}

/** Pure: merge partial patch into prefs (returns new object). */
export function mergeDiscoveryPreferences(
  current: DiscoveryPreferences,
  patch: Partial<Omit<DiscoveryPreferences, 'version'>>,
): DiscoveryPreferences {
  const next: DiscoveryPreferences = {
    ...current,
    version: 1,
    updatedAt: new Date().toISOString(),
  }

  if (patch.rubricPreset !== undefined) next.rubricPreset = patch.rubricPreset
  if (patch.aeAggressiveness !== undefined) next.aeAggressiveness = patch.aeAggressiveness
  if (patch.harvestTiming !== undefined) next.harvestTiming = patch.harvestTiming
  if (patch.harvestTimingSticky !== undefined) {
    next.harvestTimingSticky = patch.harvestTimingSticky
  }
  if (patch.rareDiseaseBoost !== undefined) next.rareDiseaseBoost = patch.rareDiseaseBoost
  if (patch.tourExampleSet !== undefined) next.tourExampleSet = patch.tourExampleSet
  if (patch.collaborationMode !== undefined) next.collaborationMode = patch.collaborationMode

  // Explicit customWeights in patch: set or clear
  if ('customWeights' in patch) {
    if (patch.customWeights) {
      next.customWeights = { ...patch.customWeights }
    } else {
      delete next.customWeights
    }
  }

  // Choosing a new preset without customWeights in patch clears custom weights
  if (patch.rubricPreset !== undefined && !('customWeights' in patch)) {
    delete next.customWeights
  }

  return next
}

/** Pure: build ScoreRubric from preferences. */
export function scoreRubricFromPreferences(prefs: DiscoveryPreferences): ScoreRubric {
  return createDefaultScoreRubric(prefs.rubricPreset, {
    aeAggressiveness: prefs.aeAggressiveness,
    weights: prefs.customWeights,
  })
}

/**
 * Pure: map prefs → rank request harvest flags.
 * board-promote (default): no rank-time harvest; rank-time: harvest top-K.
 */
export function harvestFlagsFromPreferences(prefs: Pick<DiscoveryPreferences, 'harvestTiming'>): {
  runSafetyHarvest: boolean
  runNoveltyHarvest: boolean
} {
  const rankTime = prefs.harvestTiming === 'rank-time'
  return {
    runSafetyHarvest: rankTime,
    runNoveltyHarvest: rankTime,
  }
}

/** Tooltip copy for UI (implementer-ready). */
export const PREFERENCE_TOOLTIPS = {
  rubricPreset: {
    balanced:
      'Equal-ish triage across efficacy, stage, safety. No single axis dominates. Best for general / first use.',
    repurposing:
      '↑ clinicalStage + safety; ↓ novelty. Approved/clinical candidates rise; obscure bioactives fall. Rare-disease drug reuse, known-safety bias.',
    'novel-bioactive':
      '↑ efficacy + novelty; ↓ clinicalStage. Tool compounds / early actives rise; phase 4 may fall. New target chemistry, SAR exploration.',
    'safety-first':
      '↑ safety weight; missing safety is penalized. Sparse AE data hurts rank. Conservative labs.',
  },
  aeAggressiveness: {
    'soft-flag':
      'FAERS/recall as badges with a soft floor for high clinical-stage drugs. Approved drugs rarely buried by AE volume alone. FAERS is voluntary reporting — not incidence. Empty ≠ safe.',
    'hard-penalty':
      'Full safety weight in composite, no floor. High AE counts push candidates down even if approved. Use when kill-risk matters more than repurposing feasibility. Can over-penalize widely used drugs.',
  },
  harvestTiming: {
    'board-promote':
      'openFDA + literature after promote or “Load safety scores”. Protects fast cheap shortlist; safety/novelty null until loaded. Fast triage, large candidate sets.',
    'rank-time':
      'Harvest immediately after cheap score for top 15. +~8–12s typical; full axes on first list. Decision-ready list in one pass.',
  },
  tourExampleSet: {
    mixed: 'Mixed rare + common disease examples for a broad audience.',
    'common-only': 'High-data-density indications for teaching / demos.',
    'rare-only': 'Rare/phenotype-first examples for rare-disease labs.',
  },
  collaborationMode: {
    'solo-export': 'Download project/pack JSON/MD always. Privacy, offline, v1 default.',
    'share-links-when-available':
      'Enables Share pack when available. Content-hashed TTL link; still not multi-tenant edit.',
  },
} as const

export const RUBRIC_PRESET_LABELS: Record<RubricPresetId, string> = {
  balanced: 'Balanced (default)',
  repurposing: 'Repurposing-heavy',
  'novel-bioactive': 'Novel bioactive-heavy',
  'safety-first': 'Safety-first',
}

export const TOUR_EXAMPLE_SET_LABELS: Record<TourExampleSetPref, string> = {
  mixed: 'Mixed rare + common',
  'common-only': 'Common-only',
  'rare-only': 'Rare-only',
}

// ── localStorage I/O (browser only) ──────────────────────────────────────────

export function loadDiscoveryPreferences(): DiscoveryPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_DISCOVERY_PREFERENCES }
  try {
    const raw = localStorage.getItem(DISCOVERY_PREFS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_DISCOVERY_PREFERENCES }
    return parseDiscoveryPreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_DISCOVERY_PREFERENCES }
  }
}

export function saveDiscoveryPreferences(prefs: DiscoveryPreferences): void {
  if (typeof window === 'undefined') return
  try {
    const toStore: DiscoveryPreferences = {
      ...prefs,
      version: 1,
      updatedAt: prefs.updatedAt || new Date().toISOString(),
    }
    localStorage.setItem(DISCOVERY_PREFS_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // quota / private mode — ignore
  }
}

export function resetDiscoveryPreferences(): DiscoveryPreferences {
  const next: DiscoveryPreferences = {
    ...DEFAULT_DISCOVERY_PREFERENCES,
    updatedAt: new Date().toISOString(),
  }
  saveDiscoveryPreferences(next)
  return next
}

export function updateDiscoveryPreferences(
  patch: Partial<Omit<DiscoveryPreferences, 'version'>>,
): DiscoveryPreferences {
  const current = loadDiscoveryPreferences()
  const next = mergeDiscoveryPreferences(current, patch)
  saveDiscoveryPreferences(next)
  return next
}

/** Beachhead persona presets (v2.1 §0.2) — local prefs only. */
export type BeachheadPersonaId = 'repurposing' | 'rare-lab'

export function applyBeachheadPersona(persona: BeachheadPersonaId): DiscoveryPreferences {
  if (persona === 'rare-lab') {
    return updateDiscoveryPreferences({
      rubricPreset: 'repurposing',
      aeAggressiveness: 'soft-flag',
      harvestTiming: 'board-promote',
      tourExampleSet: 'rare-only',
      rareDiseaseBoost: true,
      collaborationMode: 'solo-export',
    })
  }
  return updateDiscoveryPreferences({
    rubricPreset: 'balanced',
    aeAggressiveness: 'soft-flag',
    harvestTiming: 'board-promote',
    tourExampleSet: 'mixed',
    rareDiseaseBoost: false,
    collaborationMode: 'solo-export',
  })
}
