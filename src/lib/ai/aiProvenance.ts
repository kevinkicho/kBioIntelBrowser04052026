/**
 * AI content provenance contract — every model-generated surface should expose:
 * - system + user prompt (what was sent)
 * - regenerate with review
 * - paginated prior runs
 * - optional model / kind / mode metadata
 *
 * Product law: AI is non-of-record; prompts are audit artifacts only.
 */

import type { AiDataKind } from '@/lib/firebase/aiDataSync'

export interface AiContentProvenanceMeta {
  kind: AiDataKind
  mode: string
  /** Exact system prompt last sent (or deterministic note) */
  promptSystem?: string | null
  /** Exact user prompt last sent */
  promptUser?: string | null
  model?: string | null
  /** Catalog version string e.g. evidenceFirst@v1 */
  version?: string | null
  /** Filter history by entity context */
  contextKey?: string | null
  /** Last saved generation id for navigator focus */
  activeGenId?: string | null
  /** Bump to reload history after a run */
  historyRefreshKey?: number | string
  /** Deterministic artifact (no model) */
  deterministic?: boolean
}

export function hasAiPrompt(meta: Pick<AiContentProvenanceMeta, 'promptSystem' | 'promptUser'>): boolean {
  return Boolean((meta.promptSystem || '').trim() || (meta.promptUser || '').trim())
}

export function formatAiProvenanceLabel(meta: AiContentProvenanceMeta): string {
  if (meta.deterministic) return 'Deterministic artifact · no model prompt'
  const bits = [meta.kind, meta.mode]
  if (meta.model) bits.push(meta.model)
  return bits.filter(Boolean).join(' · ')
}

/** Honesty lines for export / Monday pack */
export const AI_PROVENANCE_HONESTY = [
  'AI outputs are non-of-record — verify in free public primary sources',
  'Prompt text is the audit trail of what was sent to the user-connected model',
  'Regenerate may change wording; claim ids / hub facts remain of-record when present',
  'Not clinical or regulatory decision support',
] as const
