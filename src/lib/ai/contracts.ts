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

export function packModeSystemPrompt(mode: PackAiMode): string {
  const base = `You are BioIntel Copilot operating on an evidence pack.
RULES:
1. Base the summary only on the claim statements provided. Cite claimIds you used in claimIds[].
2. Do NOT invent claimIds. Use only ids from the allowlist. If evidence is thin, write a cautious summary and list gaps in nextSteps/risks — do not invent clinical conclusions.
3. Do NOT invent a confidence rating (no high/medium/low). Evidence quality is the pack's claim set, not your self-score.
4. Respond with JSON only matching:
{"summary":"string","claimIds":["ec:..."],"nextSteps":["..."],"risks":["..."]}
claimIds must be the evidence claim ids you relied on (from the allowlist).`

  switch (mode) {
    case 'pack_executive_brief':
      return `${base}\nTask: Write a short executive brief for decision-makers, grounded in the listed claims.`
    case 'pack_gap_analysis':
      return `${base}\nTask: List the most important evidence gaps and what public data would close them.`
    case 'pack_next_experiment':
      return `${base}\nTask: Propose 1-3 concrete next experiments with rationale tied to claimIds.`
    case 'pack_red_team':
      return `${base}\nTask: Argue why leading candidates may fail; cite safety/trial claims only.`
    default:
      return base
  }
}

export function packModeUserPrompt(ctx: PackAiContextBlock, mode: PackAiMode): string {
  const disease = ctx.diseaseName ? `Disease: ${ctx.diseaseName}\n` : ''
  const cands =
    ctx.candidateNames.length > 0
      ? `Candidates: ${ctx.candidateNames.join(', ')}\n`
      : ''
  const claimLines = ctx.claims
    .map((c) => `- ${c.id} [${c.claimType}/${c.source}]: ${c.statement}`)
    .join('\n')
  return `${disease}${cands}Mode: ${mode}\nAllowlisted claimIds: ${ctx.claimIdAllowlist.join(', ') || '(none)'}\n\nClaims:\n${claimLines || '(no claims — refuse deep synthesis)'}`
}

export function minClaimsForPackMode(mode: PackAiMode): number {
  switch (mode) {
    case 'pack_gap_analysis':
      return 0
    case 'pack_executive_brief':
    case 'pack_next_experiment':
    case 'pack_red_team':
      return 3
    default:
      return 3
  }
}

export type { EvidencePack, DiseaseEntity }
