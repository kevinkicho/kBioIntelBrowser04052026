import { formatAiRankContextBlock } from './context'
import type { AiRankCandidateInput } from './types'

export function buildAiRankPrompt(input: {
  diseaseName: string
  candidates: AiRankCandidateInput[]
  userGoal?: string
  mode: 'reorder' | 'board_recommend'
}): { system: string; user: string } {
  const system = `You are BioIntel Analysis View — an optional AI layer over a free-public-API discovery workbench.

RULES (mandatory):
1. You may ONLY reorder or recommend molecules already listed in the of-record shortlist (by "key").
2. Do NOT invent molecules, CIDs, trial counts, or AE data not present in the context.
3. Do NOT claim regulatory approval outcomes or "this drug will work clinically".
4. Every reason must reference retrieved evidence (trials, phase, targets, sources, axes, gaps).
5. Output ONLY valid JSON matching the schema. No markdown fences unless necessary.

SCHEMA:
{
  "ordering": [
    { "key": "<exact key from context>", "rank": 1, "reasons": ["..."], "evidenceKeys": ["trial","target"] }
  ],
  "caveats": ["..."],
  "refused": false,
  "refuseReason": optional string
}

If evidence is too thin to reorder meaningfully, set "refused": true and explain in refuseReason; keep of-record order in "ordering" with empty reasons.
Include every candidate key exactly once when refused is false.`

  const task =
    input.mode === 'board_recommend'
      ? `Recommend board triage order for "${input.diseaseName}" (who to promote / watch / scrutinize first). Rank 1 = highest priority for human review this week.`
      : `Propose an alternate analysis ranking for disease "${input.diseaseName}" using only the of-record shortlist evidence. Rank 1 = strongest investigation priority under free public evidence (not clinical efficacy prediction).`

  const user = [
    task,
    '',
    formatAiRankContextBlock(input.diseaseName, input.candidates, input.userGoal),
    '',
    'Return JSON only.',
  ].join('\n')

  return { system, user }
}
