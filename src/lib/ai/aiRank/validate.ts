import type { AiRankCandidateInput, AiRankItem, AiRankResult } from './types'

function extractJsonObject(raw: string): unknown {
  const t = raw.trim()
  try {
    return JSON.parse(t)
  } catch {
    /* fall through */
  }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      /* fall through */
    }
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1))
    } catch {
      /* fall through */
    }
  }
  return null
}

/**
 * Parse + validate AI ordering against allowlisted of-record keys.
 * Invalid / partial outputs fall back to of-record order with refused flag.
 */
export function parseAndValidateAiRank(
  raw: string,
  inputs: AiRankCandidateInput[],
  opts?: { model?: string },
): AiRankResult {
  const generatedAt = new Date().toISOString()
  const allowed = new Map(inputs.map((c) => [c.key, c]))
  const ofRecordOrder: AiRankItem[] = inputs.map((c, i) => ({
    key: c.key,
    name: c.name,
    rank: i + 1,
    reasons: [],
    evidenceKeys: [],
  }))

  const parsed = extractJsonObject(raw) as {
    ordering?: unknown[]
    caveats?: unknown
    refused?: unknown
    refuseReason?: unknown
  } | null

  if (!parsed || typeof parsed !== 'object') {
    return {
      ordering: ofRecordOrder,
      caveats: ['Model output was not valid JSON; showing of-record order.'],
      refused: true,
      refuseReason: 'unparseable_output',
      model: opts?.model,
      generatedAt,
    }
  }

  const refused = Boolean(parsed.refused)
  const caveats = Array.isArray(parsed.caveats)
    ? parsed.caveats.map((c) => String(c).slice(0, 300)).filter(Boolean)
    : []
  const refuseReason =
    typeof parsed.refuseReason === 'string' ? parsed.refuseReason.slice(0, 400) : undefined

  if (!Array.isArray(parsed.ordering) || parsed.ordering.length === 0) {
    return {
      ordering: ofRecordOrder,
      caveats: [...caveats, 'Empty ordering; of-record preserved.'],
      refused: true,
      refuseReason: refuseReason || 'empty_ordering',
      model: opts?.model,
      generatedAt,
    }
  }

  const seen = new Set<string>()
  const items: AiRankItem[] = []
  for (const row of parsed.ordering) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const key = String(r.key || '').trim()
    if (!key || !allowed.has(key) || seen.has(key)) continue
    seen.add(key)
    const base = allowed.get(key)!
    const reasons = Array.isArray(r.reasons)
      ? r.reasons.map((x) => String(x).slice(0, 240)).filter(Boolean).slice(0, 6)
      : []
    const evidenceKeys = Array.isArray(r.evidenceKeys)
      ? r.evidenceKeys.map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 8)
      : []
    items.push({
      key,
      name: base.name,
      rank: items.length + 1,
      reasons,
      evidenceKeys,
    })
  }

  // Append any missing of-record candidates (model dropped them)
  for (const c of inputs) {
    if (seen.has(c.key)) continue
    items.push({
      key: c.key,
      name: c.name,
      rank: items.length + 1,
      reasons: ['Not reordered by model — kept of-record position.'],
      evidenceKeys: [],
    })
  }

  // Re-number ranks 1..n
  const ordering = items.map((it, i) => ({ ...it, rank: i + 1 }))

  if (seen.size < inputs.length * 0.5) {
    return {
      ordering: ofRecordOrder,
      caveats: [...caveats, 'Too few valid keys matched; of-record preserved.'],
      refused: true,
      refuseReason: refuseReason || 'insufficient_key_match',
      model: opts?.model,
      generatedAt,
    }
  }

  return {
    ordering,
    caveats,
    refused,
    refuseReason,
    model: opts?.model,
    generatedAt,
  }
}

/** Map AI ordering back onto legacy candidates (stable object identity). */
export function applyAiOrderToCandidates<T extends { name: string; cid: number | null }>(
  candidates: T[],
  result: AiRankResult,
  keyFn: (c: T, index: number) => string,
): T[] {
  const byKey = new Map(candidates.map((c, i) => [keyFn(c, i), c]))
  const out: T[] = []
  for (const item of result.ordering) {
    const c = byKey.get(item.key)
    if (c) {
      out.push(c)
      byKey.delete(item.key)
    }
  }
  for (const c of Array.from(byKey.values())) out.push(c)
  return out
}
