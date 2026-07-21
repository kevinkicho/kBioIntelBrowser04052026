/**
 * Claim-bound Research Hypothesis AI contracts (project narrative theses).
 * Distinct from set-ops `/hypothesis` and from free-form Discover ranking AI.
 */

import type { EvidenceClaim, MoleculeCandidate, DiseaseEntity, ResearchHypothesis } from '@/lib/domain'
import type { StructuredInsight } from './contracts'

export type RhAiMode =
  | 'rh_thesis_draft'
  | 'rh_rival_hypotheses'
  | 'rh_next_experiments'
  | 'rh_gap_map'
  | 'rh_adversarial_review'
  | 'rh_lab_meeting'
  | 'rh_specific_aims'
  | 'rh_custom'

export interface RhAiContextBlock {
  title: string
  thesisPreview: string
  diseaseName?: string
  candidateNames: string[]
  targetIds: string[]
  claims: Array<{ id: string; statement: string; claimType: string; source: string }>
  claimIdAllowlist: string[]
  hypStatus?: string
}

export interface RhAiRequestBody {
  mode: RhAiMode
  /** Minimal hyp + claims for grounding */
  hypothesis: Pick<
    ResearchHypothesis,
    'id' | 'title' | 'thesis' | 'claimIds' | 'candidateIds' | 'status' | 'role'
  >
  claims: EvidenceClaim[]
  candidates?: MoleculeCandidate[]
  disease?: DiseaseEntity | null
  targetIds?: string[]
  model?: string
  ollamaUrl?: string
  customQuestion?: string
}

export interface RhStructuredInsight extends StructuredInsight {
  /** Optional structured sections for thesis studio */
  sections?: {
    workingClaim?: string
    supporting?: string[]
    killCriteria?: string[]
    openQuestions?: string[]
    falsifiers?: string[]
  }
  rivals?: Array<{ role: 'primary' | 'rival' | 'null'; title: string; thesis: string }>
  experiments?: Array<{
    description: string
    rationale?: string
    priority?: 'high' | 'medium' | 'low'
    relatedClaimIds?: string[]
    experimentType?: string
    successCriteria?: string
    failCriteria?: string
    costTier?: 'low' | 'medium' | 'high'
  }>
  gaps?: Array<{ facet: string; message: string; suggestedAction: string }>
  overclaims?: string[]
}

export function buildRhAiContext(input: {
  title: string
  thesis: string
  claims: EvidenceClaim[]
  candidates?: MoleculeCandidate[]
  disease?: DiseaseEntity | null
  targetIds?: string[]
  status?: string
}): RhAiContextBlock {
  const claims = (input.claims ?? []).slice(0, 80).map((c) => ({
    id: c.id,
    statement: c.statement,
    claimType: c.claimType,
    source: c.provenance?.source ?? 'unknown',
  }))
  return {
    title: input.title,
    thesisPreview: (input.thesis || '').slice(0, 4000),
    diseaseName: input.disease?.name,
    candidateNames: (input.candidates ?? []).slice(0, 20).map((c) => c.identity.name),
    targetIds: input.targetIds ?? [],
    claims,
    claimIdAllowlist: claims.map((c) => c.id),
    hypStatus: input.status,
  }
}

export function rhModeTaskLabel(mode: RhAiMode): string {
  switch (mode) {
    case 'rh_thesis_draft':
      return 'Draft a structured thesis: working claim, support, kill criteria, falsifiers.'
    case 'rh_rival_hypotheses':
      return 'Compare primary vs rival vs null explanations from the same claims.'
    case 'rh_next_experiments':
      return 'Propose 1–3 Monday experiments with claim ids, priority, and kill criteria.'
    case 'rh_gap_map':
      return 'List evidence gaps and free-public actions that would close them.'
    case 'rh_adversarial_review':
      return 'Stress-test the thesis: overclaims, missing counters, safer rewrites.'
    case 'rh_lab_meeting':
      return 'Draft a 5-minute lab-meeting script grounded only in claims.'
    case 'rh_specific_aims':
      return 'Draft grant-style Aim 1–3 from thesis + experiments + claims.'
    case 'rh_custom':
      return 'Ask your own question about this hypothesis (still claim-bound).'
    default:
      return ''
  }
}

const RH_JSON_RULES = `You are BioIntel Copilot on a project Research Hypothesis (narrative thesis, not set-ops filters).
RULES:
1. Use ONLY the claim statements provided. Put used claim ids in claimIds[] from the allowlist.
2. Do NOT invent claimIds, clinical efficacy, regulatory conclusions, or dosing advice.
3. Investigation priority only — never say a drug "works" or "will be approved".
4. Respond with JSON only:
{"summary":"string","claimIds":["ec:..."],"nextSteps":["..."],"risks":["..."],"sections":{"workingClaim":"...","supporting":["..."],"killCriteria":["..."],"openQuestions":["..."],"falsifiers":["..."]},"rivals":[{"role":"primary|rival|null","title":"...","thesis":"..."}],"experiments":[{"description":"...","rationale":"...","priority":"high|medium|low","relatedClaimIds":["ec:..."],"successCriteria":"...","failCriteria":"...","costTier":"low|medium|high"}],"gaps":[{"facet":"...","message":"...","suggestedAction":"..."}],"overclaims":["..."]}
Omit unused keys. Prefer sections for thesis modes; experiments for next-experiment mode; rivals for rival mode; gaps for gap map; overclaims for adversarial.`

export function rhModeSystemPrompt(mode: RhAiMode): string {
  switch (mode) {
    case 'rh_thesis_draft':
      return `${RH_JSON_RULES}\nTask: Draft a structured research thesis from the claims. Fill sections.workingClaim, supporting, killCriteria, openQuestions, falsifiers. summary = short narrative combining them.`
    case 'rh_rival_hypotheses':
      return `${RH_JSON_RULES}\nTask: Propose primary, rival, and null (insufficient evidence) explanations. Fill rivals[] with three entries. summary compares them.`
    case 'rh_next_experiments':
      return `${RH_JSON_RULES}\nTask: Propose 1-3 concrete next experiments. Fill experiments[] with relatedClaimIds from allowlist, success/fail criteria (qualitative), costTier. summary is the plan overview.`
    case 'rh_gap_map':
      return `${RH_JSON_RULES}\nTask: List evidence gaps vs a well-rounded small-molecule triage pack. Fill gaps[] with free public data actions. summary ranks the top gaps.`
    case 'rh_adversarial_review':
      return `${RH_JSON_RULES}\nTask: Adversarial review of the current thesis vs claims. Fill overclaims[], risks, nextSteps (rewrites that stay within claims). summary is the critique.`
    case 'rh_lab_meeting':
      return `${RH_JSON_RULES}\nTask: Write a 5-minute lab-meeting brief in summary (bullets ok). Include one kill risk in risks and nextSteps for Monday.`
    case 'rh_specific_aims':
      return `${RH_JSON_RULES}\nTask: Draft Specific Aims style text in summary (Aim 1/2/3). Ground each aim in claimIds. experiments[] optional.`
    case 'rh_custom':
      return `You are BioIntel Copilot answering a user question about a research hypothesis and its claims.
RULES:
1. Answer only from the claim statements and thesis context provided.
2. Mention claim ids in brackets [ec:…] when you rely on them.
3. No efficacy predictions or regulatory language.
4. Clear prose (not JSON) unless asked otherwise.`
    default:
      return RH_JSON_RULES
  }
}

export function rhModeUserPrompt(
  ctx: RhAiContextBlock,
  mode: RhAiMode,
  customQuestion?: string,
): string {
  const disease = ctx.diseaseName ? `Disease: ${ctx.diseaseName}\n` : ''
  const cands =
    ctx.candidateNames.length > 0 ? `Candidates: ${ctx.candidateNames.join(', ')}\n` : ''
  const targets =
    ctx.targetIds.length > 0 ? `Targets: ${ctx.targetIds.join(', ')}\n` : ''
  const claimLines = ctx.claims
    .map((c) => `- ${c.id} [${c.claimType}/${c.source}]: ${c.statement}`)
    .join('\n')
  const block = `${disease}${cands}${targets}Hypothesis title: ${ctx.title}\nStatus: ${ctx.hypStatus ?? 'draft'}\n\nCurrent thesis:\n${ctx.thesisPreview || '(empty)'}\n\nAllowlisted claimIds: ${ctx.claimIdAllowlist.join(', ') || '(none)'}\n\nClaims:\n${claimLines || '(no claims)'}`

  if (mode === 'rh_custom') {
    const q = (customQuestion || '').trim() || '(no question)'
    return `${block}\n\nUser question:\n${q}`
  }
  return `${block}\n\nMode: ${mode}\nTask: ${rhModeTaskLabel(mode)}`
}

export function rhModePromptPreview(
  mode: RhAiMode,
  input: Parameters<typeof buildRhAiContext>[0],
  customQuestion?: string,
): { system: string; user: string; task: string } {
  const ctx = buildRhAiContext(input)
  return {
    system: rhModeSystemPrompt(mode),
    user: rhModeUserPrompt(ctx, mode, customQuestion),
    task: rhModeTaskLabel(mode),
  }
}

export function minClaimsForRhMode(mode: RhAiMode): number {
  switch (mode) {
    case 'rh_gap_map':
    case 'rh_custom':
      return 0
    case 'rh_adversarial_review':
      return 1
    case 'rh_thesis_draft':
    case 'rh_rival_hypotheses':
    case 'rh_next_experiments':
    case 'rh_lab_meeting':
    case 'rh_specific_aims':
      return 3
    default:
      return 3
  }
}

export function isStructuredRhMode(mode: RhAiMode): boolean {
  return mode !== 'rh_custom'
}
