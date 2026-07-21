/**
 * Parse a saved AI generation into a displayable insight payload.
 * Tolerates task object, JSON content, or plain-text content.
 */

import type { StructuredInsight } from '@/lib/ai/contracts'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

function asInsight(raw: unknown): StructuredInsight | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const summary = typeof o.summary === 'string' ? o.summary : ''
  const claimIds = Array.isArray(o.claimIds)
    ? o.claimIds.map(String)
    : Array.isArray(o.evidenceIds)
      ? o.evidenceIds.map(String)
      : []
  const nextSteps = Array.isArray(o.nextSteps) ? o.nextSteps.map(String) : undefined
  const risks = Array.isArray(o.risks) ? o.risks.map(String) : undefined
  // Accept any object that looks like structured insight OR has free text
  if (!summary && claimIds.length === 0 && !nextSteps?.length && !risks?.length) {
    // Maybe nested under insight key
    if (o.insight && typeof o.insight === 'object') return asInsight(o.insight)
    return null
  }
  return {
    summary: summary || '(no summary)',
    claimIds,
    confidence:
      o.confidence === 'high' || o.confidence === 'medium' || o.confidence === 'low'
        ? o.confidence
        : 'low',
    nextSteps,
    risks,
  }
}

/**
 * Restore StructuredInsight (or plain text wrapped as insight) from a history row.
 * Returns null only when there is truly nothing usable.
 */
export function parseAiGenerationInsight(
  entry: AiGeneratedRecord | null | undefined,
): StructuredInsight | null {
  if (!entry) return null

  if (entry.task != null) {
    const fromTask = asInsight(entry.task)
    if (fromTask) return fromTask
  }

  const raw = (entry.content || '').trim()
  if (raw) {
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw) as unknown
        const fromJson = asInsight(parsed)
        if (fromJson) return fromJson
      } catch {
        /* plain text below */
      }
    }
    // Plain text / error body — still loadable into the insight panel
    return {
      summary: raw,
      claimIds: [],
      confidence: 'low',
      nextSteps: [],
      risks: entry.error ? [entry.error] : [],
    }
  }

  if (entry.error?.trim()) {
    return {
      summary: entry.error.trim(),
      claimIds: [],
      confidence: 'low',
      nextSteps: [],
      risks: [entry.error.trim()],
    }
  }

  return null
}
