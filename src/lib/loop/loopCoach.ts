/**
 * Finish-rate loop coach — pure next-step from solo product events.
 * Raises M1 completion without LLM of-record rank.
 */

export interface LoopCoachEvent {
  name: string
  ts?: string
  props?: Record<string, string | number | boolean | null | undefined>
}

export type LoopCoachStepId =
  | 'start_discover'
  | 'confirm_and_rank'
  | 'save_to_board'
  | 'promote_or_pack'
  | 'open_rh'
  | 'monday_handoff'
  | 'loop_complete'

export interface LoopCoachAdvice {
  stepId: LoopCoachStepId
  title: string
  why: string
  href: string
  cta: string
  /** 0–100 rough progress through north-star loop */
  progressPct: number
}

function has(events: readonly LoopCoachEvent[], name: string): boolean {
  return events.some((e) => e.name === name)
}

function hasPromote(events: readonly LoopCoachEvent[]): boolean {
  return events.some(
    (e) => e.name === 'board_status_changed' && String(e.props?.status ?? '') === 'promote',
  )
}

/**
 * Next action to complete discover → board → pack → RH → Monday.
 */
export function nextLoopCoachAdvice(
  events: readonly LoopCoachEvent[],
  opts?: { campaignHref?: string },
): LoopCoachAdvice {
  const campaign = opts?.campaignHref ?? '/campaign'
  const ranked = has(events, 'discover_rank_completed')
  const boarded = has(events, 'board_candidate_added')
  const packed =
    has(events, 'pack_exported') || has(events, 'pack_opened')
  const rh = has(events, 'research_hypothesis_opened')
  const monday = events.some(
    (e) =>
      e.name === 'ui_surface_action' &&
      (String(e.props?.surface ?? '') === 'monday_pack' ||
        String(e.props?.surface ?? '') === 'next_experiment'),
  )

  if (monday && rh && packed && boarded && ranked) {
    return {
      stepId: 'loop_complete',
      title: 'Loop complete this session',
      why: 'You ranked, boarded, packed, opened RH, and exported Monday work. Export analytics if measuring M1.',
      href: '/analytics',
      cta: 'View finish rate',
      progressPct: 100,
    }
  }
  if (rh && packed) {
    return {
      stepId: 'monday_handoff',
      title: 'Export Monday handoff',
      why: 'Close the north star with library experiments + of-record honesty pack.',
      href: boarded ? '/projects' : campaign,
      cta: 'Open board / Monday handoff',
      progressPct: 85,
    }
  }
  if (packed) {
    return {
      stepId: 'open_rh',
      title: 'Open research hypothesis',
      why: 'Seed RH from pack so claims rehydrate and thesis stays claim-bound.',
      href: '/projects',
      cta: 'Open projects',
      progressPct: 70,
    }
  }
  if (boarded || hasPromote(events)) {
    return {
      stepId: 'promote_or_pack',
      title: 'Build claim-rich pack',
      why: 'Promote candidates, wait harvest, export pack (M3 citable ≥5 soft target).',
      href: '/projects',
      cta: 'Open board pack',
      progressPct: 50,
    }
  }
  if (ranked) {
    return {
      stepId: 'save_to_board',
      title: 'Save ≥1 candidate to a project',
      why: 'Board is required for pack → RH loop completion (M1).',
      href: '/discover',
      cta: 'Back to Discover shortlist',
      progressPct: 35,
    }
  }
  if (has(events, 'discover_started') || has(events, 'discover_disease_confirmed')) {
    return {
      stepId: 'confirm_and_rank',
      title: 'Finish deterministic rank',
      why: 'Confirm multi-hit disease if needed, pin targets, run of-record rank (no LLM).',
      href: '/discover',
      cta: 'Continue Discover',
      progressPct: 15,
    }
  }
  return {
    stepId: 'start_discover',
    title: 'Start a golden path',
    why: 'One-click beachhead raises finish rate vs panel thrash.',
    href: campaign,
    cta: 'Open campaign',
    progressPct: 0,
  }
}
