/**
 * Structured AI contracts for pack/discover modes (PR13).
 * Molecule free-text PromptModes remain unchanged in promptTemplates.ts.
 */

import type { EvidenceClaim, MoleculeCandidate, DiseaseEntity } from '@/lib/domain'
import type { EvidencePack } from '@/lib/evidence/pack'

export type PackAiMode =
  | 'pack_executive_brief'
  | 'pack_gap_analysis'
  | 'pack_next_experiment'
  | 'pack_red_team'
  /** Free-form user prompt grounded in pack claims (chat). */
  | 'pack_custom_prompt'

export interface StructuredInsight {
  summary: string
  /** Must reference EvidenceClaim.id values from the pack */
  claimIds: string[]
  /**
   * Only meaningful value is `insufficient` (refuse path).
   * high/medium/low were LLM self-ratings and are not shown in the UI.
   * @deprecated Do not display high|medium|low as product confidence.
   */
  confidence?: 'high' | 'medium' | 'low' | 'insufficient'
  nextSteps?: string[]
  risks?: string[]
}

export interface PackAiRequest {
  mode: PackAiMode
  pack: Pick<EvidencePack, 'id' | 'title' | 'claims' | 'candidates' | 'disease'>
  model?: string
  ollamaUrl?: string
}

export interface PackAiResponse {
  ok: boolean
  mode: PackAiMode
  insight?: StructuredInsight
  refused?: boolean
  refuseReason?: string
  validationErrors?: string[]
}

export interface PackAiContextBlock {
  title: string
  diseaseName?: string
  candidateNames: string[]
  claims: Array<{ id: string; statement: string; claimType: string; source: string }>
  claimIdAllowlist: string[]
}

export function buildPackAiContext(
  pack: Pick<EvidencePack, 'title' | 'claims' | 'candidates' | 'disease'>,
): PackAiContextBlock {
  const claims = (pack.claims ?? []).slice(0, 80).map((c: EvidenceClaim) => ({
    id: c.id,
    statement: c.statement,
    claimType: c.claimType,
    source: c.provenance?.source ?? 'unknown',
  }))
  return {
    title: pack.title,
    diseaseName: pack.disease?.name,
    candidateNames: (pack.candidates ?? [])
      .slice(0, 20)
      .map((c: MoleculeCandidate) => c.identity.name),
    claims,
    claimIdAllowlist: claims.map((c) => c.id),
  }
}

/** Short UI description for each mode chip. */
export function packModeTaskLabel(mode: PackAiMode): string {
  switch (mode) {
    case 'pack_executive_brief':
      return 'Short decision-oriented brief grounded in pack claims.'
    case 'pack_gap_analysis':
      return 'Evidence gaps and what public data would close them.'
    case 'pack_next_experiment':
      return '1–3 concrete next experiments with claim-tied rationale.'
    case 'pack_red_team':
      return 'Why leading candidates may fail (safety/trial claims only).'
    case 'pack_custom_prompt':
      return 'Ask your own question about this pack (claim-bound free-form chat).'
    default:
      return ''
  }
}

const PACK_JSON_RULES = `You are BioIntel Copilot operating on an evidence pack.
RULES:
1. Base the summary only on the claim statements provided. Cite claimIds you used in claimIds[].
2. Do NOT invent claimIds. Use only ids from the allowlist. If evidence is thin, write a cautious summary and list gaps in nextSteps/risks — do not invent clinical conclusions.
3. Do NOT invent a confidence rating (no high/medium/low). Evidence quality is the pack's claim set, not your self-score.
4. Respond with JSON only matching:
{"summary":"string","claimIds":["ec:..."],"nextSteps":["..."],"risks":["..."]}
claimIds must be the evidence claim ids you relied on (from the allowlist).`

export function packModeSystemPrompt(mode: PackAiMode): string {
  switch (mode) {
    case 'pack_executive_brief':
      return `${PACK_JSON_RULES}\nTask: Write a short executive brief for decision-makers, grounded in the listed claims.`
    case 'pack_gap_analysis':
      return `${PACK_JSON_RULES}\nTask: List the most important evidence gaps and what public data would close them.`
    case 'pack_next_experiment':
      return `${PACK_JSON_RULES}\nTask: Propose 1-3 concrete next experiments with rationale tied to claimIds.`
    case 'pack_red_team':
      return `${PACK_JSON_RULES}\nTask: Argue why leading candidates may fail; cite safety/trial claims only.`
    case 'pack_custom_prompt':
      return `You are BioIntel Copilot answering a user question about an evidence pack.
RULES:
1. Answer only from the claim statements and pack context provided.
2. When you rely on a claim, mention its id in brackets like [ec:…] from the allowlist.
3. Do not invent clinical conclusions or claimIds.
4. Write clear prose (not JSON) unless the user asks for a specific format.
5. Investigation priority only — not a prediction of clinical success.`
    default:
      return PACK_JSON_RULES
  }
}

export function packModeUserPrompt(
  ctx: PackAiContextBlock,
  mode: PackAiMode,
  customQuestion?: string,
): string {
  const disease = ctx.diseaseName ? `Disease: ${ctx.diseaseName}\n` : ''
  const cands =
    ctx.candidateNames.length > 0
      ? `Candidates: ${ctx.candidateNames.join(', ')}\n`
      : ''
  const claimLines = ctx.claims
    .map((c) => `- ${c.id} [${c.claimType}/${c.source}]: ${c.statement}`)
    .join('\n')
  const packBlock = `${disease}${cands}Allowlisted claimIds: ${ctx.claimIdAllowlist.join(', ') || '(none)'}\n\nClaims:\n${claimLines || '(no claims)'}`

  if (mode === 'pack_custom_prompt') {
    const q = (customQuestion || '').trim() || '(no question provided)'
    return `${packBlock}\n\nUser question:\n${q}`
  }

  return `${packBlock}\n\nMode: ${mode}\nTask: ${packModeTaskLabel(mode)}`
}

/** Full prompts as sent to the model (for UI preview). */
export function packModePromptPreview(
  mode: PackAiMode,
  pack: Pick<EvidencePack, 'title' | 'claims' | 'candidates' | 'disease'>,
  customQuestion?: string,
): { system: string; user: string; task: string } {
  const ctx = buildPackAiContext(pack)
  return {
    system: packModeSystemPrompt(mode),
    user: packModeUserPrompt(ctx, mode, customQuestion),
    task: packModeTaskLabel(mode),
  }
}

export function minClaimsForPackMode(mode: PackAiMode): number {
  switch (mode) {
    case 'pack_gap_analysis':
    case 'pack_custom_prompt':
      return 0
    case 'pack_executive_brief':
    case 'pack_next_experiment':
    case 'pack_red_team':
      return 3
    default:
      return 3
  }
}

export function isStructuredPackMode(mode: PackAiMode): boolean {
  return mode !== 'pack_custom_prompt'
}

export type { EvidencePack, DiseaseEntity }
