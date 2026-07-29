/** UI playbook tip cards for Discover / board empty states. */
import type { ResearchGoal } from './types'

/** UI surfaces that show one-click playbook tips. */
export type PlaybookTipSurface =
  | 'discover-idle'
  | 'discover-empty'
  | 'discover-results'
  | 'board-empty'
  | 'board-ready'

/** Optional in-app next step (not just a catalog link). */
export type PlaybookRunActionId =
  | 'focus_discover_search'
  | 'open_projects'
  | 'open_compare'
  | 'scroll_pack_section'
  | 'open_discover'
  | 'open_methodology_kit_diff'

export interface PlaybookTipCard {
  surface: PlaybookTipSurface
  playbookId: string
  title: string
  goal: ResearchGoal
  summary: string
  humanCta: string
  href: string
  /** Optional secondary link (e.g. Discover) */
  actionHref?: string
  actionLabel?: string
  /** Primary run action for one-click next step in the app */
  runActionId?: PlaybookRunActionId
  runActionLabel?: string
}

/** Curated one-click tip cards for empty / next-step UI surfaces. */
export function playbookTipsForSurface(surface: PlaybookTipSurface): PlaybookTipCard[] {
  switch (surface) {
    case 'discover-idle':
      return [
        {
          surface,
          playbookId: 'disease_to_shortlist',
          title: 'Disease → shortlist',
          goal: 'discover',
          summary: 'Rank with free public APIs (no LLM), densify top-K, save to a project.',
          humanCta: 'Enter a disease above or pick a journey, then Rank.',
          href: '/how-it-works#disease_to_shortlist',
          runActionId: 'focus_discover_search',
          runActionLabel: 'Focus search',
        },
        {
          surface,
          playbookId: 'agent_ops_loop',
          title: 'Agent ops loop',
          goal: 'ops',
          summary: 'Agents: health → tools suggest → research → logs → gate.',
          humanCta: 'npm run biointel -- tools suggest --goal discover',
          href: '/how-it-works#agent_ops_loop',
        },
      ]
    case 'discover-empty':
      return [
        {
          surface,
          playbookId: 'disease_to_shortlist',
          title: 'Retry the shortlist loop',
          goal: 'discover',
          summary: 'Empty gather ≠ no biology. Try another disease spelling, pin targets, or rare/Orphanet path.',
          humanCta: 'Change query, pin 1–3 targets, Rank again.',
          href: '/how-it-works#disease_to_shortlist',
          runActionId: 'focus_discover_search',
          runActionLabel: 'Edit query',
        },
        {
          surface,
          playbookId: 'cid_evidence_deep_dive',
          title: 'Known CID instead?',
          goal: 'evidence',
          summary: 'If you already have a PubChem CID, skip rank and deep-dive evidence + research kit.',
          humanCta: 'Open molecule profile or export a research kit via CLI.',
          href: '/how-it-works#cid_evidence_deep_dive',
          actionHref: '/methodology#kit-diff',
          actionLabel: 'Kit diff',
          runActionId: 'open_methodology_kit_diff',
          runActionLabel: 'Kit-diff tool',
        },
      ]
    case 'discover-results':
      return [
        {
          surface,
          playbookId: 'board_pack_to_rh',
          title: 'Next: board → pack → RH',
          goal: 'pack',
          summary: 'Save candidates, promote, build a claim-bound pack, seed a research hypothesis.',
          humanCta: 'Save to project on a card, then open the board.',
          href: '/how-it-works#board_pack_to_rh',
          actionHref: '/projects',
          actionLabel: 'Projects',
          runActionId: 'open_projects',
          runActionLabel: 'Open projects',
        },
        {
          surface,
          playbookId: 'compare_and_choose',
          title: 'Compare before promote',
          goal: 'compare',
          summary: 'Open 2+ profiles or use compare hub for of-record side-by-side facts.',
          humanCta: 'Open profiles from cards; AI reorder views are non-of-record.',
          href: '/how-it-works#compare_and_choose',
          actionHref: '/compare',
          actionLabel: 'Compare',
          runActionId: 'open_compare',
          runActionLabel: 'Open compare',
        },
      ]
    case 'board-empty':
      return [
        {
          surface,
          playbookId: 'disease_to_shortlist',
          title: 'Fill the board from Discover',
          goal: 'discover',
          summary: 'Deterministic shortlist first, then Save to project — board packs need candidates.',
          humanCta: 'Go to Discover, rank, save ≥1 candidate.',
          href: '/how-it-works#disease_to_shortlist',
          actionHref: '/discover',
          actionLabel: 'Open Discover',
          runActionId: 'open_discover',
          runActionLabel: 'Open Discover',
        },
        {
          surface,
          playbookId: 'board_pack_to_rh',
          title: 'After save: pack loop',
          goal: 'pack',
          summary: 'Once candidates land: promote → harvest → pack → optional RH.',
          humanCta: 'Playbook opens when the board has candidates.',
          href: '/how-it-works#board_pack_to_rh',
        },
      ]
    case 'board-ready':
      return [
        {
          surface,
          playbookId: 'board_pack_to_rh',
          title: 'Promote → pack → RH',
          goal: 'pack',
          summary: 'Promote candidates, build pack (5 extractors max), seed claim-bound RH.',
          humanCta: 'Set Promote, wait harvest, Build pack, Seed RH.',
          href: '/how-it-works#board_pack_to_rh',
          runActionId: 'scroll_pack_section',
          runActionLabel: 'Jump to packs',
        },
        {
          surface,
          playbookId: 'compare_and_choose',
          title: 'Compare & triage',
          goal: 'compare',
          summary: 'Side-by-side hub + board statuses; AI suggestions need your confirm.',
          humanCta: 'Use board statuses; do not auto-apply AI.',
          href: '/how-it-works#compare_and_choose',
          actionHref: '/compare',
          actionLabel: 'Compare hub',
          runActionId: 'open_compare',
          runActionLabel: 'Open compare',
        },
      ]
    default:
      return []
  }
}
