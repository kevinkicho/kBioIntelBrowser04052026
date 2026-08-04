/**
 * Map solo product-event queue → campaign stage completion (v3 G1 coherence).
 * Pure — no I/O. Of-record Discover rank is unaffected.
 *
 * Manual checkboxes remain; this auto-fills stages when the user has already
 * done the real work elsewhere (rank, promote, pack, RH, Monday pack).
 */

import type { CampaignStageId } from './campaignWorkspace'
import type { ProductEventName } from '@/lib/productEvents'

export interface StageProgressEvent {
  name: string
  props?: Record<string, string | number | boolean | null | undefined>
  ts?: string
}

export type StageDoneSource = 'event' | 'manual' | 'both'

export interface StageProgressResult {
  /** Stages completed by product events (and present on the template). */
  autoDone: CampaignStageId[]
  /** Effective done = auto ∪ manual (manual-only stages stay manual). */
  effectiveDone: CampaignStageId[]
  /** Per-stage provenance for UI badges. */
  sources: Partial<Record<CampaignStageId, StageDoneSource>>
}

/**
 * Event → stage rules (first matching event completes the stage).
 * Keep names canonical — no dual-emit aliases.
 */
export const STAGE_EVENT_RULES: ReadonlyArray<{
  stageId: CampaignStageId
  /** Human-readable for methodology / UI. */
  label: string
  matches: (ev: StageProgressEvent) => boolean
}> = [
  {
    stageId: 'disease_confirm',
    label: 'Disease confirmed or Discover started',
    matches: (ev) =>
      ev.name === 'discover_disease_confirmed' ||
      (ev.name === 'discover_started' && ev.props?.multiHit !== true),
  },
  {
    stageId: 'pin_targets',
    label: 'Orphanet pins or rank with targets',
    matches: (ev) => {
      if (ev.name === 'discover_orphanet_genes') return true
      if (ev.name === 'discover_started' && typeof ev.props?.targetCount === 'number') {
        return (ev.props.targetCount as number) > 0
      }
      // Rank completed implies gather/score path ran (targets optional for disease-only)
      if (ev.name === 'discover_rank_completed') return true
      return false
    },
  },
  {
    stageId: 'rank_shortlist',
    label: 'Deterministic rank completed',
    matches: (ev) => ev.name === 'discover_rank_completed',
  },
  {
    stageId: 'promote_harvest',
    label: 'Promote status or safety harvest',
    matches: (ev) => {
      if (ev.name === 'harvest_safety_done') return true
      if (ev.name === 'board_status_changed') {
        return String(ev.props?.status ?? '') === 'promote'
      }
      return false
    },
  },
  {
    stageId: 'evidence_pack',
    label: 'Pack opened or exported',
    matches: (ev) => ev.name === 'pack_exported' || ev.name === 'pack_opened',
  },
  {
    stageId: 'research_hypothesis',
    label: 'Research hypothesis opened',
    matches: (ev) => ev.name === 'research_hypothesis_opened',
  },
  {
    stageId: 'monday_experiment',
    label: 'Monday pack export or NextExperiment surface',
    matches: (ev) => {
      if (ev.name === 'ui_surface_action') {
        const surface = String(ev.props?.surface ?? '')
        return surface === 'monday_pack' || surface === 'next_experiment'
      }
      return false
    },
  },
]

/** Canonical event names that feed campaign auto-progress (docs / tests). */
export const CAMPAIGN_PROGRESS_EVENT_NAMES: readonly ProductEventName[] = [
  'discover_started',
  'discover_disease_confirmed',
  'discover_rank_completed',
  'discover_orphanet_genes',
  'board_status_changed',
  'harvest_safety_done',
  'pack_opened',
  'pack_exported',
  'research_hypothesis_opened',
  'ui_surface_action',
]

/**
 * Which template stages are completed by the given product-event stream.
 * Only stages listed in `templateStageIds` are returned (template-scoped).
 */
export function autoCompletedStagesFromEvents(
  events: readonly StageProgressEvent[],
  templateStageIds: readonly CampaignStageId[],
): CampaignStageId[] {
  const allowed = new Set(templateStageIds)
  const done = new Set<CampaignStageId>()
  for (const rule of STAGE_EVENT_RULES) {
    if (!allowed.has(rule.stageId) || done.has(rule.stageId)) continue
    for (const ev of events) {
      if (rule.matches(ev)) {
        done.add(rule.stageId)
        break
      }
    }
  }
  // Stable order = template order
  return templateStageIds.filter((id) => done.has(id))
}

/**
 * Merge product-event auto progress with manual localStorage checkboxes.
 */
export function mergeCampaignStageProgress(
  events: readonly StageProgressEvent[],
  templateStageIds: readonly CampaignStageId[],
  manualDone: readonly CampaignStageId[],
): StageProgressResult {
  const autoDone = autoCompletedStagesFromEvents(events, templateStageIds)
  const autoSet = new Set(autoDone)
  const manualSet = new Set(manualDone.filter((id) => templateStageIds.includes(id)))
  const sources: StageProgressResult['sources'] = {}
  const effective: CampaignStageId[] = []
  for (const id of templateStageIds) {
    const a = autoSet.has(id)
    const m = manualSet.has(id)
    if (a || m) {
      effective.push(id)
      sources[id] = a && m ? 'both' : a ? 'event' : 'manual'
    }
  }
  return { autoDone, effectiveDone: effective, sources }
}

/** Progress percent 0–100. */
export function campaignProgressPercent(
  effectiveDoneCount: number,
  stageCount: number,
): number {
  if (stageCount <= 0) return 0
  return Math.round((effectiveDoneCount / stageCount) * 100)
}
