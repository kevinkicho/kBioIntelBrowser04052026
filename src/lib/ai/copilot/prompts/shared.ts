import type { MoleculeContext } from '@/lib/ai/copilot/context'

/** Legacy soft floor — deep modes now use evidenceDensity.ts (stricter). */
export const AI_MIN_COMPLETENESS_RATIO = 0.2
export const AI_MIN_PANELS_WITH_DATA = 8

export const SYSTEM_PROMPT = `You are BioIntel Copilot inside a free-API research workbench. Prefer grounded artifacts over eloquent essays.

CRITICAL — EVIDENCE RULES:
1. Use ONLY named rows, registry ids (NCT, pChEMBL, PMID/DOI), and panel keys present in the evidence pack.
2. If the pack marks a domain empty, say "not retrieved" — never "no association".
3. Prefer "insufficient evidence for synthesis" over plausible fiction. Fail closed.
4. FAERS/openFDA counts are spontaneous reports, not incidence or causality.
5. Not clinical or regulatory decision support.

CRITICAL — ANTI-FLUFF:
Do NOT produce secretary recitation of counts dressed as insight.
Do NOT invent cross-domain stories when only counts exist.
When evidence is dense: connect SPECIFIC named rows (e.g. COX-1 pChEMBL + nausea report count) with [panel] tags.
When evidence is thin: list solid rows + top gaps + what to load next — stop.

Your rules:
1. Cite panel keys and exact values from the pack.
2. Separate facts (from pack) from hypotheses (label as hypothesis).
3. Actionable next steps must name categories/panels to load or registry URLs to open.
4. Keep output tight: bullets > paragraphs unless asked for a brief.

You use correct scientific terminology.`

export function shouldRefuseDeepSynthesis(context: MoleculeContext): boolean {
  const withData = context.dataCompleteness?.panelsWithData ?? 0
  const total = context.dataCompleteness?.totalPanels ?? 0
  const named =
    (context.rich?.topTargetActivities?.length ?? 0) +
    (context.rich?.mechanismDetails?.length ?? 0) +
    (context.rich?.trialDetails?.length ?? 0) +
    (context.rich?.topAdverseEvents?.length ?? 0)
  if (withData < AI_MIN_PANELS_WITH_DATA) return true
  if (total > 0 && withData / total < AI_MIN_COMPLETENESS_RATIO) return true
  if (named < 12) return true
  return false
}

export function buildLowCompletenessGuard(context: MoleculeContext): string {
  const withData = context.dataCompleteness?.panelsWithData ?? 0
  const total = context.dataCompleteness?.totalPanels ?? 0
  return [
    `DATA COMPLETENESS GATE: only ${withData}/${total || '?'} panels have real data.`,
    'Do NOT invent mechanism–AE causal chains or gene–disease links.',
    'Respond with: (1) what solid evidence exists with [panel] citations, (2) top data gaps, (3) what to load next.',
    'If asked for deep synthesis, refuse and list missing panels.',
  ].join('\n')
}
