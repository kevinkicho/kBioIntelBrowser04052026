/**
 * Post-stream validation for structured Copilot task modes (plan 06).
 */

import type { Filter } from '@/lib/hypothesis/types'
import { validatePriorArtQuery } from '@/lib/ai/aiTasks/priorArt'
import { validateDiffSafety } from '@/lib/ai/aiTasks/diffSafety'
import { validateSuggestNext, type SuggestedEntity } from '@/lib/ai/aiTasks/suggestNext'
import { validateHypothesisSeed, buildHypothesisSeedUrl } from '@/lib/ai/aiTasks/hypothesisSeed'
import type { PromptMode } from '@/lib/ai/copilot/prompts'
import { isCopilotTaskMode } from './resolveInsightPrompt'

export type CopilotTaskPayload =
  | { kind: 'prior_art'; query: string }
  | {
      kind: 'diff_safety'
      text: string
      paragraphCount: number
      currentName: string
      otherName: string
    }
  | { kind: 'suggest_next'; entities: SuggestedEntity[] }
  | { kind: 'hypothesis_seed'; filters: Filter[]; url: string }

export interface ValidateTaskModeInput {
  mode: PromptMode
  raw: string
  moleculeName: string
  synonyms?: string[]
  diffOtherName?: string
}

export interface ValidateTaskModeResult {
  task?: CopilotTaskPayload
  validationError?: string
}

/**
 * Validate task-mode model output. Non-task modes return empty result.
 */
export function validateTaskModeOutput(input: ValidateTaskModeInput): ValidateTaskModeResult {
  if (!isCopilotTaskMode(input.mode) || !input.raw) return {}

  if (input.mode === 'prior_art_query') {
    const v = validatePriorArtQuery(input.raw, {
      name: input.moleculeName,
      synonyms: input.synonyms,
    })
    if (v.ok) return { task: { kind: 'prior_art', query: v.query } }
    return { validationError: `AI response was unclear, try again. (${v.reason})` }
  }

  if (input.mode === 'differential_safety') {
    const other = input.diffOtherName
    if (!other) {
      return { validationError: 'AI response was unclear, try again. (missing comparison target)' }
    }
    const v = validateDiffSafety(input.raw, input.moleculeName, other)
    if (v.ok) {
      return {
        task: {
          kind: 'diff_safety',
          text: v.text,
          paragraphCount: v.paragraphCount,
          currentName: input.moleculeName,
          otherName: other,
        },
      }
    }
    return { validationError: `AI response was unclear, try again. (${v.reason})` }
  }

  if (input.mode === 'suggest_next') {
    const v = validateSuggestNext(input.raw)
    if (v.ok) return { task: { kind: 'suggest_next', entities: v.entities } }
    return { validationError: `AI response was unclear, try again. (${v.reason})` }
  }

  if (input.mode === 'hypothesis_seed') {
    const v = validateHypothesisSeed(input.raw)
    if (v.ok) {
      return {
        task: {
          kind: 'hypothesis_seed',
          filters: v.filters,
          url: buildHypothesisSeedUrl(v.filters),
        },
      }
    }
    return { validationError: `AI response was unclear, try again. (${v.reason})` }
  }

  return {}
}
