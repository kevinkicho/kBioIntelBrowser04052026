/**
 * Human-readable formatting for stored AI generations.
 * Content is often JSON.stringify(task) — never show raw JSON in product UI.
 */

import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

export type FormattedAiKind =
  | 'ai_rank'
  | 'structured_insight'
  | 'rh_insight'
  | 'error'
  | 'prose'
  | 'empty'

export interface FormattedAiGeneration {
  kind: FormattedAiKind
  /** One-line / few-line preview for lists */
  preview: string
  /** Plain prose summary */
  summary?: string
  /** Ranked list (board / discover AI) */
  ranking?: Array<{
    rank: number
    name: string
    reasons: string[]
    key?: string
  }>
  caveats?: string[]
  nextSteps?: string[]
  risks?: string[]
  claimIds?: string[]
  sections?: {
    workingClaim?: string
    supporting?: string[]
    killCriteria?: string[]
    openQuestions?: string[]
    falsifiers?: string[]
  }
  rivals?: Array<{ role: string; title: string; thesis: string }>
  experiments?: Array<{
    description: string
    priority?: string
    rationale?: string
  }>
  gaps?: Array<{ facet: string; message: string; suggestedAction: string }>
  overclaims?: string[]
  refused?: boolean
  refuseReason?: string
  /** True when content was JSON we successfully parsed */
  wasJson: boolean
}

function tryParseJson(raw: string): unknown | null {
  const t = raw.trim()
  if (!t) return null
  if (!(t.startsWith('{') || t.startsWith('['))) return null
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

function formatAiRank(obj: Record<string, unknown>): FormattedAiGeneration | null {
  if (!Array.isArray(obj.ordering)) return null
  const ordering = obj.ordering
    .map((row, i) => {
      if (!isRecord(row)) return null
      const name = String(row.name || row.key || `Item ${i + 1}`)
      const rank = typeof row.rank === 'number' ? row.rank : i + 1
      const reasons = asStringArray(row.reasons)
      return {
        rank,
        name,
        reasons,
        key: row.key != null ? String(row.key) : undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  if (ordering.length === 0 && !obj.refused) return null

  const caveats = asStringArray(obj.caveats)
  const refused = Boolean(obj.refused)
  const refuseReason =
    typeof obj.refuseReason === 'string' ? obj.refuseReason : undefined

  const top = ordering
    .slice(0, 3)
    .map((o) => `${o.rank}. ${o.name}`)
    .join(' · ')

  return {
    kind: 'ai_rank',
    wasJson: true,
    preview: refused
      ? `Refused${refuseReason ? `: ${refuseReason}` : ''}`
      : top || 'AI review order',
    summary: refused
      ? refuseReason || 'Model refused to reorder'
      : `Review order (${ordering.length} candidates)`,
    ranking: ordering,
    caveats,
    refused,
    refuseReason,
  }
}

function formatStructuredInsight(
  obj: Record<string, unknown>,
  rh = false,
): FormattedAiGeneration | null {
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''
  const claimIds = asStringArray(obj.claimIds)
  const nextSteps = asStringArray(obj.nextSteps)
  const risks = asStringArray(obj.risks)
  const overclaims = asStringArray(obj.overclaims)

  const sections = isRecord(obj.sections)
    ? {
        workingClaim:
          typeof obj.sections.workingClaim === 'string'
            ? obj.sections.workingClaim
            : undefined,
        supporting: asStringArray(obj.sections.supporting),
        killCriteria: asStringArray(obj.sections.killCriteria),
        openQuestions: asStringArray(obj.sections.openQuestions),
        falsifiers: asStringArray(obj.sections.falsifiers),
      }
    : undefined

  const rivals = Array.isArray(obj.rivals)
    ? obj.rivals
        .filter(isRecord)
        .map((r) => ({
          role: String(r.role || 'rival'),
          title: String(r.title || 'Rival'),
          thesis: String(r.thesis || ''),
        }))
        .filter((r) => r.title || r.thesis)
    : undefined

  const experiments = Array.isArray(obj.experiments)
    ? obj.experiments
        .filter(isRecord)
        .map((e) => ({
          description: String(e.description || ''),
          priority: e.priority != null ? String(e.priority) : undefined,
          rationale: e.rationale != null ? String(e.rationale) : undefined,
        }))
        .filter((e) => e.description)
    : undefined

  const gaps = Array.isArray(obj.gaps)
    ? obj.gaps
        .filter(isRecord)
        .map((g) => ({
          facet: String(g.facet || 'gap'),
          message: String(g.message || ''),
          suggestedAction: String(g.suggestedAction || ''),
        }))
        .filter((g) => g.message)
    : undefined

  const hasRh =
    Boolean(sections?.workingClaim) ||
    Boolean(rivals?.length) ||
    Boolean(experiments?.length) ||
    Boolean(gaps?.length) ||
    overclaims.length > 0

  if (!summary && !nextSteps.length && !risks.length && !hasRh && !claimIds.length) {
    return null
  }

  const preview =
    summary.slice(0, 200) ||
    nextSteps[0] ||
    experiments?.[0]?.description ||
    'Structured insight'

  return {
    kind: rh || hasRh ? 'rh_insight' : 'structured_insight',
    wasJson: true,
    preview: preview + (preview.length >= 200 ? '…' : ''),
    summary: summary || undefined,
    nextSteps: nextSteps.length ? nextSteps : undefined,
    risks: risks.length ? risks : undefined,
    claimIds: claimIds.length ? claimIds : undefined,
    sections,
    rivals,
    experiments,
    gaps,
    overclaims: overclaims.length ? overclaims : undefined,
  }
}

/**
 * Format a stored AI generation for UI (preview + structured blocks).
 */
export function formatAiGeneration(
  entry: Pick<AiGeneratedRecord, 'content' | 'error' | 'task' | 'kind' | 'mode'>,
): FormattedAiGeneration {
  if (entry.error && !entry.content?.trim() && !entry.task) {
    return {
      kind: 'error',
      preview: entry.error.slice(0, 200),
      summary: entry.error,
      wasJson: false,
    }
  }

  const fromTask = entry.task != null ? entry.task : null
  const fromContent = entry.content ? tryParseJson(entry.content) : null
  const payload = fromTask ?? fromContent

  if (isRecord(payload)) {
    const rank = formatAiRank(payload)
    if (rank) return rank

    const isRh =
      entry.kind === 'rh' ||
      (typeof entry.mode === 'string' && entry.mode.startsWith('rh_'))
    const insight = formatStructuredInsight(payload, isRh)
    if (insight) return insight
  }

  const prose = (entry.content || entry.error || '').trim()
  if (!prose) {
    return { kind: 'empty', preview: '(empty)', wasJson: false }
  }

  // Looks like JSON but failed structured parse — still avoid dumping braces if possible
  if (prose.startsWith('{') || prose.startsWith('[')) {
    const parsed = tryParseJson(prose)
    if (isRecord(parsed)) {
      const keys = Object.keys(parsed).slice(0, 6).join(', ')
      return {
        kind: 'prose',
        preview: `Structured payload (${keys}${Object.keys(parsed).length > 6 ? '…' : ''})`,
        summary: 'Could not fully interpret this generation; expand prompt for details.',
        wasJson: true,
      }
    }
  }

  return {
    kind: 'prose',
    preview: prose.slice(0, 220) + (prose.length > 220 ? '…' : ''),
    summary: prose,
    wasJson: false,
  }
}

/** Short list preview only. */
export function formatAiGenerationPreview(
  entry: Pick<AiGeneratedRecord, 'content' | 'error' | 'task' | 'kind' | 'mode'>,
  maxLen = 160,
): string {
  const f = formatAiGeneration(entry)
  const p = f.preview || '(empty)'
  return p.length > maxLen ? `${p.slice(0, maxLen)}…` : p
}
