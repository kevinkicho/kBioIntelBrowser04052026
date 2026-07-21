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

/** Max claims embedded in Pack AI prompts (was 80; raised for denser free-API packs). */
export const PACK_AI_CONTEXT_CLAIM_LIMIT = 140

export interface PackAiContextBlock {
  title: string
  diseaseName?: string
  candidateNames: string[]
  claims: Array<{
    id: string
    statement: string
    claimType: string
    source: string
    sourceUrl?: string
    quote?: string
  }>
  claimIdAllowlist: string[]
  /** Facet histogram for thorough gap analysis */
  claimTypeCounts: Record<string, number>
  /** Distinct provenance sources present in the pack */
  sources: string[]
  totalClaimCount: number
  contextClaimCount: number
}

export function buildPackAiContext(
  pack: Pick<EvidencePack, 'title' | 'claims' | 'candidates' | 'disease'>,
): PackAiContextBlock {
  const all = pack.claims ?? []
  const claimTypeCounts: Record<string, number> = {}
  const sourceSet = new Set<string>()
  for (const c of all) {
    claimTypeCounts[c.claimType] = (claimTypeCounts[c.claimType] ?? 0) + 1
    if (c.provenance?.source) sourceSet.add(c.provenance.source)
  }

  // Prefer breadth: round-robin sample by claimType so literature/safety aren't all truncated
  const byType = new Map<string, EvidenceClaim[]>()
  for (const c of all) {
    const list = byType.get(c.claimType) ?? []
    list.push(c)
    byType.set(c.claimType, list)
  }
  const selected: EvidenceClaim[] = []
  const types = Array.from(byType.keys()).sort()
  let guard = 0
  while (selected.length < PACK_AI_CONTEXT_CLAIM_LIMIT && guard < PACK_AI_CONTEXT_CLAIM_LIMIT * 4) {
    guard += 1
    let added = false
    for (const t of types) {
      const bucket = byType.get(t)
      if (!bucket?.length) continue
      selected.push(bucket.shift()!)
      added = true
      if (selected.length >= PACK_AI_CONTEXT_CLAIM_LIMIT) break
    }
    if (!added) break
  }

  const claims = selected.map((c: EvidenceClaim) => ({
    id: c.id,
    statement: c.statement,
    claimType: c.claimType,
    source: c.provenance?.source ?? 'unknown',
    sourceUrl: c.provenance?.sourceUrl,
    quote: c.provenance?.quote?.slice(0, 160),
  }))
  return {
    title: pack.title,
    diseaseName: pack.disease?.name,
    candidateNames: (pack.candidates ?? [])
      .slice(0, 20)
      .map((c: MoleculeCandidate) => c.identity.name),
    claims,
    claimIdAllowlist: claims.map((c) => c.id),
    claimTypeCounts,
    sources: Array.from(sourceSet).sort(),
    totalClaimCount: all.length,
    contextClaimCount: claims.length,
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

const PACK_JSON_RULES = `You are BioIntel Copilot operating on an evidence pack built from free public APIs (trials, safety, bioactivity, literature, grants, patents, regulators, org landscape, etc.).
RULES:
1. Base the summary only on the claim statements provided. Cite claimIds you used in claimIds[].
2. Do NOT invent claimIds. Use only ids from the allowlist. If evidence is thin, write a cautious summary and list gaps in nextSteps/risks — do not invent clinical conclusions.
3. Prefer thorough analysis across claim types (mechanism, binds-target, indicated-for, trial, safety, property, literature, other) and multiple sources when present.
4. Do NOT invent a confidence rating (no high/medium/low). Evidence quality is the pack's claim set, not your self-score.
5. FAERS/recall counts are reporting counts, not incidence. Label/Orange Book/Purple Book rows are registry facts, not treatment advice.
6. Respond with JSON only matching:
{"summary":"string","claimIds":["ec:..."],"nextSteps":["..."],"risks":["..."]}
claimIds must be the evidence claim ids you relied on (from the allowlist). Include several claimIds when the pack is dense.`

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
  const typeSummary = Object.entries(ctx.claimTypeCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}:${n}`)
    .join(', ')
  const sourceSummary = (ctx.sources ?? []).slice(0, 24).join('; ')
  const inventory =
    `Pack inventory: ${ctx.totalClaimCount ?? ctx.claims.length} total claims` +
    (ctx.contextClaimCount != null && ctx.totalClaimCount != null && ctx.contextClaimCount < ctx.totalClaimCount
      ? ` (${ctx.contextClaimCount} embedded in this prompt for breadth)`
      : '') +
    `\nClaim types: ${typeSummary || '(none)'}` +
    `\nSources: ${sourceSummary || '(none)'}\n`
  const claimLines = ctx.claims
    .map((c) => {
      const quote = c.quote ? ` | quote: ${c.quote}` : ''
      const url = c.sourceUrl ? ` | url: ${c.sourceUrl}` : ''
      return `- ${c.id} [${c.claimType}/${c.source}]: ${c.statement}${quote}${url}`
    })
    .join('\n')
  const packBlock = `${disease}${cands}${inventory}Allowlisted claimIds: ${ctx.claimIdAllowlist.join(', ') || '(none)'}\n\nClaims:\n${claimLines || '(no claims)'}`

  if (mode === 'pack_custom_prompt') {
    const q = (customQuestion || '').trim() || '(no question provided)'
    return `${packBlock}\n\nUser question:\n${q}`
  }

  return `${packBlock}\n\nMode: ${mode}\nTask: ${packModeTaskLabel(mode)}\nUse multiple claim types and sources when available; cite claimIds. Do not invent clinical conclusions.`
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
