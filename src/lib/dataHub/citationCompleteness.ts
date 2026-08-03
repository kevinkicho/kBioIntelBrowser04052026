/**
 * Citation completeness (v3 E1) — of-record pack/kit quality metric.
 * Pure; no network.
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { DataHubLedger } from './types'
import { isDataHubValueEmpty } from './types'

export interface CitationCompleteness {
  /** 0–1 fraction of evaluated items with usable provenance */
  score: number
  total: number
  withSource: number
  withSourceUrl: number
  withRetrievedAt: number
  citable: number
  /** Ready for “export as citable” when score ≥ threshold (default 0.6) */
  meetsExportThreshold: boolean
  threshold: number
  notes: string[]
}

const DEFAULT_THRESHOLD = 0.6

function claimCitable(c: EvidenceClaim): boolean {
  const hasSource = Boolean(c.provenance?.source && String(c.provenance.source).trim())
  const hasUrl = Boolean(c.provenance?.sourceUrl && String(c.provenance.sourceUrl).trim())
  const hasRetrieved = Boolean(c.provenance?.retrievedAt)
  return hasSource && (hasUrl || hasRetrieved)
}

/**
 * Score evidence claims for citable export (pack / RH handoff).
 */
export function scoreClaimCitationCompleteness(
  claims: readonly EvidenceClaim[] | null | undefined,
  opts?: { threshold?: number },
): CitationCompleteness {
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD
  const list = claims ?? []
  const total = list.length
  if (total === 0) {
    return {
      score: 0,
      total: 0,
      withSource: 0,
      withSourceUrl: 0,
      withRetrievedAt: 0,
      citable: 0,
      meetsExportThreshold: false,
      threshold,
      notes: ['No claims to score — build a pack from of-record extractors first.'],
    }
  }

  let withSource = 0
  let withSourceUrl = 0
  let withRetrievedAt = 0
  let citable = 0
  for (const c of list) {
    if (c.provenance?.source) withSource++
    if (c.provenance?.sourceUrl) withSourceUrl++
    if (c.provenance?.retrievedAt) withRetrievedAt++
    if (claimCitable(c)) citable++
  }
  const score = Math.round((citable / total) * 1000) / 1000
  return {
    score,
    total,
    withSource,
    withSourceUrl,
    withRetrievedAt,
    citable,
    meetsExportThreshold: score >= threshold && total > 0,
    threshold,
    notes: [
      `Citable = source + (sourceUrl or retrievedAt). Threshold ${threshold}.`,
      'Not regulatory decision support — provenance quality only.',
    ],
  }
}

/**
 * Score data hub non-empty rows for source attribution quality.
 */
export function scoreHubCitationCompleteness(
  ledger: DataHubLedger,
  opts?: { threshold?: number },
): CitationCompleteness {
  const threshold = opts?.threshold ?? DEFAULT_THRESHOLD
  const rows = ledger.rows.filter((r) => !isDataHubValueEmpty(r.value))
  const total = rows.length
  if (total === 0) {
    return {
      score: 0,
      total: 0,
      withSource: 0,
      withSourceUrl: 0,
      withRetrievedAt: 0,
      citable: 0,
      meetsExportThreshold: false,
      threshold,
      notes: ['No non-empty hub facts in this session.'],
    }
  }
  let withSource = 0
  let withSourceUrl = 0
  let citable = 0
  for (const r of rows) {
    if (r.source && r.source.trim()) withSource++
    if (r.sourceUrl) withSourceUrl++
    if (r.source && r.source.trim() && (r.sourceUrl || r.source !== 'unknown')) citable++
  }
  const score = Math.round((citable / total) * 1000) / 1000
  return {
    score,
    total,
    withSource,
    withSourceUrl,
    withRetrievedAt: 0,
    citable,
    meetsExportThreshold: score >= threshold,
    threshold,
    notes: [
      'Hub citation score: non-empty facts with named free public source.',
      'Session samples only — not a complete literature review.',
    ],
  }
}
