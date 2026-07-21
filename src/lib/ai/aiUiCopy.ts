/**
 * First-look plain-language copy for AI generation surfaces.
 * Keeps product jargon out of headers; modes stay claim-bound / non-of-record.
 */

import type { PackAiMode } from '@/lib/ai/contracts'
import type { RhAiMode } from '@/lib/ai/rhContracts'

/** Turn pack_executive_brief → “Executive brief” for UI (never show raw ids). */
export function humanModeLabel(mode?: string | null): string {
  if (!mode) return ''
  const known: Record<string, string> = {
    pack_executive_brief: 'Executive brief',
    pack_gap_analysis: 'Gap analysis',
    pack_next_experiment: 'Next experiments',
    pack_red_team: 'Red team',
    pack_custom_prompt: 'Custom prompt',
    rh_thesis_draft: 'Thesis draft',
    rh_rival_hypotheses: 'Rival hypotheses',
    rh_next_experiments: 'Next experiments',
    rh_gap_map: 'Gap map',
    rh_adversarial_review: 'Adversarial review',
    rh_lab_meeting: 'Lab meeting',
    rh_specific_aims: 'Specific aims',
    rh_custom: 'Custom prompt',
    ai_analysis_reorder: 'Discover reorder',
    board_recommend: 'Board recommend',
    disease_summary: 'Disease summary',
    disease_repurposing: 'Repurposing',
    disease_gap: 'Therapeutic gaps',
    disease_connections: 'Connections',
    disease_custom: 'Custom question',
  }
  if (known[mode]) return known[mode]
  return mode
    .replace(/^pack_/, '')
    .replace(/^rh_/, '')
    .replace(/^disease_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** One-line “what you get” for pack modes (shown under mode chips). */
export function packModeExpectLine(mode: PackAiMode): string {
  switch (mode) {
    case 'pack_executive_brief':
      return 'You get: a short brief (summary + next steps + risks) using only pack claims.'
    case 'pack_gap_analysis':
      return 'You get: missing evidence and free-public data that would close gaps.'
    case 'pack_next_experiment':
      return 'You get: 1–3 concrete experiments with claim-tied rationale.'
    case 'pack_red_team':
      return 'You get: failure modes from safety/trial claims — not efficacy predictions.'
    case 'pack_custom_prompt':
      return 'You get: a free-form answer still limited to this pack’s claims.'
    default:
      return ''
  }
}

export function rhModeExpectLine(mode: RhAiMode): string {
  switch (mode) {
    case 'rh_thesis_draft':
      return 'You get: working claim, support, kill criteria, and falsifiers.'
    case 'rh_rival_hypotheses':
      return 'You get: primary vs rival vs null explanations from the same claims.'
    case 'rh_next_experiments':
      return 'You get: 1–3 Monday experiments with success/fail criteria.'
    case 'rh_gap_map':
      return 'You get: evidence gaps and free-public actions to close them.'
    case 'rh_adversarial_review':
      return 'You get: overclaims, missing counters, and safer rewrites.'
    case 'rh_lab_meeting':
      return 'You get: a 5-minute lab-meeting script grounded in claims.'
    case 'rh_specific_aims':
      return 'You get: grant-style Aim 1–3 draft from thesis + claims.'
    case 'rh_custom':
      return 'You get: an answer to your question, still claim-bound.'
    default:
      return ''
  }
}

export type AiSurfaceId =
  | 'pack'
  | 'rh'
  | 'research_lab'
  | 'discover_rank'
  | 'board_recommend'
  | 'disease'

export interface AiSurfaceIntro {
  title: string
  /** What this panel does (1 sentence). */
  what: string
  /** Prerequisites in plain language. */
  needs: string
  /** What the user should expect to see after Run. */
  gets: string
  /** Guardrail line (non-clinical / non-of-record). */
  not: string
}

export function aiSurfaceIntro(surface: AiSurfaceId): AiSurfaceIntro {
  switch (surface) {
    case 'pack':
      return {
        title: 'Pack AI',
        what: 'Ask the model to summarize, stress-test, or plan next steps from this evidence pack.',
        needs: 'Your Ollama key + model (top-bar AI), and enough claims in the pack for the mode.',
        gets: 'A structured answer (summary, next steps, risks) plus which claims it used.',
        not: 'Not ranking, not clinical advice — investigation help only. Of-record scores stay free-API.',
      }
    case 'rh':
      return {
        title: 'Hypothesis AI',
        what: 'Draft or stress-test a research thesis using only rehydrated claims on this hypothesis.',
        needs: 'Ollama key + model, and enough claims seeded from a pack for most modes.',
        gets: 'Thesis sections, rivals, experiments, or gaps — depending on the mode you pick.',
        not: 'Not set-ops filters and not “this drug works.” Claim-bound investigation only.',
      }
    case 'research_lab':
      return {
        title: 'Lab dossier AI',
        what: 'Synthesize free-public affiliation evidence for this institution (not admissions ranking).',
        needs: 'Ollama key + model, and dossier claims from public registers (ROR, OpenAlex, grants…).',
        gets: 'Brief, gaps, next activities, or caveats grounded only in those claims.',
        not: 'Not clinical referral or school ranking. BYOM live model only — no mock outputs.',
      }
    case 'discover_rank':
      return {
        title: 'Discover AI analysis',
        what: 'Optionally reorder the shortlist with model reasons. Deterministic scores stay of-record.',
        needs: 'Ollama key + model, a Discover shortlist, and your acknowledgment of the disclaimer.',
        gets: 'A suggested review order with reasons. You can flip back to of-record anytime.',
        not: 'Non-of-record only. Never changes free-API ranks. Not regulatory decision support.',
      }
    case 'board_recommend':
      return {
        title: 'Board AI triage',
        what: 'Suggest a review order and promote / watching / hold chips for board candidates.',
        needs: 'Ollama key + model and at least one candidate on the board.',
        gets: 'Suggested order + status chips. Nothing applies until you click Apply.',
        not: 'Non-of-record triage help. Kill is never auto-overridden. You confirm every change.',
      }
    case 'disease':
      return {
        title: 'Disease Intelligence',
        what: 'Synthesize genes, trial drugs, and molecules for this disease into focused briefs.',
        needs: 'Ollama key + model and some gene/drug/molecule data already on the page.',
        gets: 'Summary, repurposing ideas, gaps, or connection maps — pick a tab, then Generate.',
        not: 'Evidence-bound research help — not a clinical prediction or treatment recommendation.',
      }
    default:
      return {
        title: 'AI',
        what: 'Claim-bound generation with your model.',
        needs: 'Ollama key + model.',
        gets: 'A saved run you can revisit.',
        not: 'Not regulatory decision support.',
      }
  }
}

/** Primary run button label (first run vs again). */
export function aiRunButtonLabel(opts: {
  busy: boolean
  hasResult: boolean
  isCustom?: boolean
  surface?: AiSurfaceId
}): string {
  if (opts.busy) {
    if (opts.isCustom) return 'Thinking…'
    return 'Generating…'
  }
  if (opts.hasResult) return 'Generate again'
  if (opts.isCustom) return 'Send question'
  switch (opts.surface) {
    case 'board_recommend':
      return 'Suggest review order'
    case 'discover_rank':
      return 'Run AI analysis'
    case 'research_lab':
      return 'Run activity'
    case 'rh':
      return 'Run hypothesis AI'
    case 'disease':
      return 'Generate'
    default:
      return 'Generate'
  }
}
