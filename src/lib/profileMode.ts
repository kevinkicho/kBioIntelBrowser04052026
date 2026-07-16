/**
 * Decision profile mode helpers — discovery workbench design §4.3 / PR11.
 *
 * ProfileModeToggle: decision | full (design also called the latter "browser").
 * Decision six panels are the first-load priority surface in decision mode.
 */

import { CATEGORIES, type CategoryId, type PanelDef } from '@/lib/categoryConfig'
import type { ScoreAxisKey, ScoreVector } from '@/lib/domain'
import type { EvidenceClaim } from '@/lib/domain'
import type { MoleculeCandidate, Project } from '@/lib/domain'
import {
  extractClaimsFromCorePanels,
  type CorePanelEvidenceInput,
} from '@/lib/evidence'

/** URL / UI mode. `full` ≡ design-doc "browser". */
export type ProfileMode = 'decision' | 'full'

export const PROFILE_MODE_STORAGE_KEY = 'biointel-profile-mode-v1'

/**
 * Decision panels (design §4.3): the Core six shown first in decision mode.
 * PanelDef.id values only.
 */
export const DECISION_PANEL_IDS = [
  'chembl-mechanisms',
  'chembl',
  'clinical-trials',
  'adverse-events',
  'chembl-indications',
  'properties',
] as const

export type DecisionPanelId = (typeof DECISION_PANEL_IDS)[number]

export const DECISION_PANEL_ID_SET = new Set<string>(DECISION_PANEL_IDS)

/** Categories that host the decision six — load these first in decision mode. */
export const DECISION_CATEGORY_IDS: CategoryId[] = (() => {
  const needed = new Set<CategoryId>()
  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      if (DECISION_PANEL_ID_SET.has(panel.id)) {
        needed.add(cat.id)
      }
    }
  }
  // Stable priority order for first paint
  const priority: CategoryId[] = [
    'clinical-safety',
    'bioactivity-targets',
    'molecular-chemical',
  ]
  return [
    ...priority.filter((id) => needed.has(id)),
    ...Array.from(needed).filter((id) => !priority.includes(id)),
  ]
})()

export const AXIS_LABELS: Record<ScoreAxisKey, string> = {
  efficacy: 'Efficacy',
  clinicalStage: 'Clinical stage',
  safety: 'Safety',
  novelty: 'Novelty',
  identityTrust: 'Identity trust',
}

/** Shared axis display order (clinical precedence first). Single source of truth. */
export const AXIS_ORDER: ScoreAxisKey[] = [
  'clinicalStage',
  'efficacy',
  'safety',
  'novelty',
  'identityTrust',
]

/** Max encoded length for optional full `scores` query on molecule deep-links. */
export const MOLECULE_LINK_SCORES_MAX_ENCODED = 1500

export interface BuildMoleculeLinkUrlInput {
  cid: number
  rank: number
  diseaseName: string
  /** Composite 0–1 (always attached as `score=` for backward compatibility). */
  score: number
  /** Optional full ScoreVector; attached only when encoded JSON ≤ ~1500 chars. */
  scores?: ScoreVector | null
  projectId?: string | null
}

/**
 * Build molecule profile deep-link from Discover (or board).
 * Always includes composite `score=`. Optionally attaches compact `scores` JSON
 * when length-safe; prefer `project=` when the candidate is already on a board.
 */
export function buildMoleculeLinkUrl(input: BuildMoleculeLinkUrlInput): string {
  const params = new URLSearchParams({
    from: 'discover',
    disease: input.diseaseName,
    rank: String(input.rank),
    score: input.score.toFixed(2),
  })
  if (input.projectId) {
    params.set('project', input.projectId)
  }
  if (input.scores) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(input.scores))
      if (encoded.length <= MOLECULE_LINK_SCORES_MAX_ENCODED) {
        params.set('scores', JSON.stringify(input.scores))
      }
    } catch {
      // omit scores on serialization failure
    }
  }
  return `/molecule/${input.cid}?${params.toString()}`
}

export function isProfileMode(value: unknown): value is ProfileMode {
  return value === 'decision' || value === 'full'
}

/** Accept design alias "browser" as full. */
export function parseProfileMode(raw: string | null | undefined): ProfileMode | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'decision') return 'decision'
  if (v === 'full' || v === 'browser') return 'full'
  return null
}

export function isDecisionPanel(panelId: string): boolean {
  return DECISION_PANEL_ID_SET.has(panelId)
}

export function listDecisionPanels(): PanelDef[] {
  const out: PanelDef[] = []
  const byId = new Map<string, PanelDef>()
  for (const cat of CATEGORIES) {
    for (const panel of cat.panels) {
      byId.set(panel.id, panel)
    }
  }
  for (const id of DECISION_PANEL_IDS) {
    const p = byId.get(id)
    if (p) out.push(p)
  }
  return out
}

/**
 * Default mode when URL does not pin one.
 * Depth-from-discovery / project context → decision; otherwise full browser.
 */
export function defaultProfileMode(opts: {
  fromDiscover?: boolean
  hasProject?: boolean
  hasDisease?: boolean
}): ProfileMode {
  if (opts.fromDiscover || opts.hasProject || opts.hasDisease) return 'decision'
  return 'full'
}

export function loadStoredProfileMode(): ProfileMode | null {
  if (typeof window === 'undefined') return null
  try {
    return parseProfileMode(window.localStorage.getItem(PROFILE_MODE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveStoredProfileMode(mode: ProfileMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROFILE_MODE_STORAGE_KEY, mode)
  } catch {
    // quota / private mode — ignore
  }
}

/** Build Core panel DTO bag from merged profile category data. */
export function corePanelInputFromMerged(
  merged: Record<string, unknown>,
): CorePanelEvidenceInput {
  return {
    chemblActivities: asArray(merged.chemblActivities),
    chemblMechanisms: asArray(merged.chemblMechanisms),
    adverseEvents: asArray(merged.adverseEvents),
    clinicalTrials: asArray(merged.clinicalTrials),
    diseaseAssociations: asArray(merged.diseaseAssociations),
  }
}

function asArray<T>(value: unknown): T[] | null {
  if (value == null) return null
  return Array.isArray(value) ? (value as T[]) : null
}

/**
 * Extract decision-strip claims from loaded profile data (PR9 extractors).
 * Cap kept small for strip UI (not a full pack).
 */
export function extractDecisionStripClaims(
  merged: Record<string, unknown>,
  opts: {
    retrievedAt: string
    moleculeName: string
    subjectCandidateId?: string
    totalCap?: number
  },
): EvidenceClaim[] {
  return extractClaimsFromCorePanels(corePanelInputFromMerged(merged), {
    retrievedAt: opts.retrievedAt,
    moleculeName: opts.moleculeName,
    subjectCandidateId: opts.subjectCandidateId,
    totalCap: opts.totalCap ?? 12,
    preferFacetOrder: true,
  })
}

/** Parse composite score from discover deep-link (`score` 0–1 or 0–100). */
export function parseCompositeScoreParam(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  if (n > 1 && n <= 100) return n / 100
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

/**
 * Optional ScoreVector from URL `scores` JSON (full axes when available).
 * Falls back to composite-only vector from `score`.
 */
export function scoreVectorFromSearchParams(params: {
  score?: string | null
  scores?: string | null
}): ScoreVector | null {
  if (params.scores) {
    try {
      const parsed = JSON.parse(params.scores) as Partial<ScoreVector>
      if (parsed && typeof parsed === 'object' && parsed.axes && typeof parsed.composite === 'number') {
        return parsed as ScoreVector
      }
    } catch {
      // ignore malformed
    }
  }
  const composite = parseCompositeScoreParam(params.score ?? null)
  if (composite == null) return null
  return {
    composite,
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
    scorePhase: 'cheap',
  }
}

const PROJECT_KEY_PREFIX = 'biointel-project-v1-'

/**
 * Best-effort project read (same key as PR5 store) without hard-depending on project module.
 * Returns candidate scores when CID matches a board candidate.
 */
export function lookupProjectCandidateScores(
  projectId: string | null | undefined,
  cid: number,
): {
  projectName?: string
  candidate?: MoleculeCandidate
  scores: ScoreVector | null
  boardStatus?: string
} | null {
  if (!projectId || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PROJECT_KEY_PREFIX + projectId)
    if (!raw) return { scores: null }
    const project = JSON.parse(raw) as Project
    if (!project || !Array.isArray(project.candidates)) return { scores: null }
    const candidate = project.candidates.find(
      (c) => c.identity?.pubchemCid === cid,
    )
    return {
      projectName: project.name,
      candidate,
      scores: candidate?.scores ?? null,
      boardStatus: candidate?.boardStatus,
    }
  } catch {
    return { scores: null }
  }
}

/** Whether every decision-category load finished (loaded or error). */
export function decisionCategoriesReady(
  status: Partial<Record<CategoryId, string>>,
): boolean {
  return DECISION_CATEGORY_IDS.every((id) => {
    const s = status[id]
    return s === 'loaded' || s === 'error'
  })
}

export function decisionCategoriesLoading(
  status: Partial<Record<CategoryId, string>>,
): boolean {
  return DECISION_CATEGORY_IDS.some((id) => status[id] === 'loading')
}
