/**
 * Of-record claim graph from data hub ledger rows (no LLM).
 * Each non-empty fact → EvidenceClaim; edges link same source / domain / subject.
 */

import type { EvidenceClaim, EvidenceClaimType } from '@/lib/domain/entities'
import { buildClaim } from '@/lib/evidence/buildClaim'
import type { ClaimExtractorContext } from '@/lib/evidence/context'
import type { DataHubDomain, DataHubLedger, DataHubRow } from './types'
import { isDataHubValueEmpty } from './types'

export type HubClaimEdgeKind = 'same-source' | 'same-domain' | 'same-section'

export interface HubClaimEdge {
  from: string
  to: string
  kind: HubClaimEdgeKind
  label: string
}

export interface HubClaimGraph {
  subjectId: string
  subjectLabel: string
  claims: EvidenceClaim[]
  edges: HubClaimEdge[]
  byDomain: Record<string, number>
  bySource: Record<string, number>
  notes: string[]
}

function domainToClaimType(domain: DataHubDomain | undefined): EvidenceClaimType {
  switch (domain) {
    case 'targets':
      return 'binds-target'
    case 'clinical':
      return 'trial'
    case 'safety':
      return 'safety'
    case 'regulatory':
      return 'indicated-for'
    case 'literature':
      return 'literature'
    case 'identity':
    case 'other':
    default:
      return domain === 'identity' ? 'property' : 'other'
  }
}

function rowToClaim(
  row: DataHubRow,
  ledger: DataHubLedger,
  ctx: ClaimExtractorContext,
): EvidenceClaim {
  const claimType = domainToClaimType(row.domain)
  const statement = `${row.fact}: ${row.value}`
  return buildClaim({
    claimType,
    source: row.source || 'unknown',
    naturalKey: `${ledger.subjectId}:${row.id}`,
    statement,
    ctx,
    sourceUrl: row.sourceUrl,
    evidenceRefId: row.id,
    quote: row.detail?.slice(0, 200),
  })
}

/**
 * Build claim graph from of-record hub ledger (pure).
 */
export function buildHubClaimGraph(
  ledger: DataHubLedger,
  opts?: { maxClaims?: number; retrievedAt?: string },
): HubClaimGraph {
  const maxClaims = opts?.maxClaims ?? 80
  const ctx: ClaimExtractorContext = {
    retrievedAt: opts?.retrievedAt || new Date().toISOString(),
    subjectCandidateId: ledger.subjectId.match(/^\d+$/)
      ? `cid:${ledger.subjectId}`
      : undefined,
    moleculeName: ledger.subjectLabel,
  }

  const filled = ledger.rows.filter((r) => !isDataHubValueEmpty(r.value))
  const claims = filled.slice(0, maxClaims).map((r) => rowToClaim(r, ledger, ctx))

  const byDomain: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  for (const r of filled.slice(0, maxClaims)) {
    const d = r.domain || 'other'
    byDomain[d] = (byDomain[d] || 0) + 1
    const s = r.source || 'unknown'
    bySource[s] = (bySource[s] || 0) + 1
  }

  // Edges: same source (cap) + same domain (cap)
  const edges: HubClaimEdge[] = []
  const claimByRowId = new Map(
    filled.slice(0, maxClaims).map((r, i) => [r.id, claims[i]!.id]),
  )
  const bySrc = new Map<string, string[]>()
  const byDom = new Map<string, string[]>()
  for (const r of filled.slice(0, maxClaims)) {
    const cid = claimByRowId.get(r.id)
    if (!cid) continue
    const s = r.source || 'unknown'
    const d = r.domain || 'other'
    if (!bySrc.has(s)) bySrc.set(s, [])
    bySrc.get(s)!.push(cid)
    if (!byDom.has(d)) byDom.set(d, [])
    byDom.get(d)!.push(cid)
  }

  for (const [src, ids] of Array.from(bySrc.entries())) {
    for (let i = 0; i < Math.min(ids.length - 1, 4); i++) {
      edges.push({
        from: ids[i]!,
        to: ids[i + 1]!,
        kind: 'same-source',
        label: src,
      })
    }
  }
  for (const [dom, ids] of Array.from(byDom.entries())) {
    if (ids.length < 2) continue
    edges.push({
      from: ids[0]!,
      to: ids[1]!,
      kind: 'same-domain',
      label: dom,
    })
  }

  const notes = [
    'Claims are copied from free public API hub rows — not model-generated.',
    'Edges link shared source or domain only (structural, not causal).',
    filled.length > maxClaims
      ? `Truncated to ${maxClaims} of ${filled.length} non-empty facts.`
      : `${claims.length} of-record facts.`,
  ]

  return {
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    claims,
    edges,
    byDomain,
    bySource,
    notes,
  }
}

export function hubClaimGraphToMarkdown(graph: HubClaimGraph): string {
  const lines = [
    `# Claim graph — ${graph.subjectLabel} (${graph.subjectId})`,
    '',
    ...graph.notes.map((n) => `> ${n}`),
    '',
    `## Claims (${graph.claims.length})`,
  ]
  for (const c of graph.claims.slice(0, 60)) {
    lines.push(
      `- \`${c.id}\` [${c.claimType}] ${c.statement} · ${c.provenance.source}`,
    )
  }
  lines.push('', `## Edges (${graph.edges.length})`)
  for (const e of graph.edges.slice(0, 40)) {
    lines.push(`- ${e.from} —${e.kind}→ ${e.to} (${e.label})`)
  }
  return lines.join('\n')
}
