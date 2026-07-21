/**
 * Pure helpers: human-readable “why” text for AI recommendations.
 * Non-of-record explanations only — never invents of-record scores.
 */

import type { AiRankItem } from '@/lib/ai/aiRank/types'
import type { BoardStatus } from '@/lib/domain'
import type { PackAiMode } from '@/lib/ai/contracts'
import { packModeTaskLabel } from '@/lib/ai/contracts'

export interface AiWhyParts {
  /** Short one-liner for native title / compact */
  summary: string
  /** Multi-line body for rich tooltip */
  lines: string[]
  /** Full string for aria / title fallback */
  fullText: string
}

function joinLines(lines: string[]): string {
  return lines.filter(Boolean).join('\n')
}

/**
 * Why the model ranked this candidate here (Discover / board AI).
 */
export function buildAiRankWhy(input: {
  item?: Pick<AiRankItem, 'reasons' | 'evidenceKeys' | 'name' | 'rank'> | null
  aiRank: number
  ofRecordRank?: number | null
  name?: string
  mode?: 'reorder' | 'board_recommend'
}): AiWhyParts {
  const name = input.name || input.item?.name || 'Candidate'
  const lines: string[] = []
  lines.push(
    input.mode === 'board_recommend'
      ? `AI board recommend · #${input.aiRank} (non-of-record triage order).`
      : `AI analysis · #${input.aiRank} (non-of-record reorder).`,
  )
  if (input.ofRecordRank != null && input.ofRecordRank > 0) {
    const delta = input.ofRecordRank - input.aiRank
    if (delta === 0) {
      lines.push(`Of-record rank #${input.ofRecordRank} (unchanged vs deterministic scores).`)
    } else if (delta > 0) {
      lines.push(
        `Moved up ${delta} vs of-record #${input.ofRecordRank} (deterministic free-API scores unchanged).`,
      )
    } else {
      lines.push(
        `Moved down ${Math.abs(delta)} vs of-record #${input.ofRecordRank} (deterministic free-API scores unchanged).`,
      )
    }
  }
  const reasons = input.item?.reasons?.filter(Boolean) ?? []
  if (reasons.length) {
    lines.push('Model reasons (verify against retrieved evidence):')
    for (const r of reasons.slice(0, 6)) lines.push(`• ${r}`)
  } else {
    lines.push('No model reasons returned — treat order as weak signal only.')
  }
  const keys = input.item?.evidenceKeys?.filter(Boolean) ?? []
  if (keys.length) {
    lines.push(`Evidence tags cited: ${keys.join(', ')}.`)
  }
  lines.push('Not regulatory decision support. You confirm any promote / hold / kill.')
  const summary =
    reasons[0]?.slice(0, 120) ||
    (input.ofRecordRank != null
      ? `AI #${input.aiRank} vs of-record #${input.ofRecordRank}`
      : `AI ranked ${name} #${input.aiRank}`)
  return { summary, lines, fullText: joinLines(lines) }
}

/**
 * Why board status chip was suggested from AI rank tertile + reasons.
 */
export function buildBoardStatusSuggestWhy(input: {
  suggested: BoardStatus
  aiRank: number
  total: number
  current?: BoardStatus | null
  item?: Pick<AiRankItem, 'reasons' | 'evidenceKeys'> | null
}): AiWhyParts {
  const lines: string[] = []
  lines.push(
    `Suggested board status: ${input.suggested} (AI review order #${input.aiRank} of ${input.total}).`,
  )
  if (input.current) {
    lines.push(`Current board status: ${input.current}.`)
  }
  // Mirror suggestBoardStatusFromAiRank rules for transparency
  const tertile = input.total <= 1 ? 0 : input.aiRank / input.total
  if (input.current === 'kill') {
    lines.push('Kill is preserved — AI never auto-overrides kill.')
  } else if (input.total <= 1) {
    lines.push('Single candidate → suggest promote for review.')
  } else if (tertile <= 0.34) {
    lines.push('Top third of AI order → suggest promote.')
  } else if (tertile <= 0.67) {
    lines.push('Middle third of AI order → suggest watching.')
  } else {
    lines.push('Bottom third of AI order → suggest hold.')
  }
  const reasons = input.item?.reasons?.filter(Boolean) ?? []
  if (reasons.length) {
    lines.push('Why the model ranked it here:')
    for (const r of reasons.slice(0, 4)) lines.push(`• ${r}`)
  }
  if (input.item?.evidenceKeys?.length) {
    lines.push(`Evidence tags: ${input.item.evidenceKeys.join(', ')}.`)
  }
  lines.push('Suggestion only — Apply requires your confirmation. Non-of-record.')
  return {
    summary: `Suggest ${input.suggested}: AI #${input.aiRank}/${input.total}`,
    lines,
    fullText: joinLines(lines),
  }
}

/**
 * Why a Pack AI / lab AI mode or next-step string was offered.
 */
export function buildPackAiModeWhy(mode: PackAiMode): AiWhyParts {
  const task = packModeTaskLabel(mode)
  const lines = [
    `Pack AI mode: ${mode.replace(/^pack_/, '').replace(/_/g, ' ')}.`,
    task,
    'Answers only from allowlisted pack claim ids (free public extractors).',
    'Does not invent molecules, trials, or clinical conclusions.',
    'Uses your connected Ollama model key (BYOM) — not a paid BioIntel DB.',
  ]
  return {
    summary: task.slice(0, 140),
    lines,
    fullText: joinLines(lines),
  }
}

export function buildInsightNextStepWhy(
  step: string,
  claimIds?: string[],
): AiWhyParts {
  const lines = [
    'AI next step (claim-bound insight output):',
    step,
  ]
  if (claimIds?.length) {
    lines.push(`Grounded claim ids: ${claimIds.slice(0, 12).join(', ')}.`)
  } else {
    lines.push('No claim ids attached — treat as weak / unverified suggestion.')
  }
  lines.push('Verify against pack evidence before acting. Not clinical advice.')
  return {
    summary: step.slice(0, 140),
    lines,
    fullText: joinLines(lines),
  }
}

/** Static why-text for copilot Ask suggestion chips. */
export function buildAskSuggestionWhy(suggestion: string): AiWhyParts {
  const lines = [
    'Suggested Ask prompt (template — not a model ranking).',
    `Question: ${suggestion}`,
    'Clicking runs claim-bound / tool-using Ask with your Ollama model.',
    'Does not change of-record Discover scores or invent pack claims.',
  ]
  return {
    summary: 'Suggested question for claim-bound Ask',
    lines,
    fullText: joinLines(lines),
  }
}

/** Copilot insight mode button tooltips. */
export function buildInsightModeWhy(label: string, modeHint?: string): AiWhyParts {
  const lines = [
    `Insight action: ${label}.`,
    modeHint || 'Generates a claim/evidence-grounded insight with your connected model.',
    'Uses retrieved free-API profile/disease/gene context — not paid commercial DBs.',
    'Not of-record rank; not regulatory decision support.',
  ]
  return {
    summary: `${label} — AI insight (verify)`,
    lines,
    fullText: joinLines(lines),
  }
}
