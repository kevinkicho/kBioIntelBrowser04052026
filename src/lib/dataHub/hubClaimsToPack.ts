/**
 * Handoff: hub claim graph → pack-ready claim list (of-record, no LLM).
 */

import type { EvidenceClaim } from '@/lib/domain/entities'
import type { DataHubLedger } from './types'
import { buildHubClaimGraph, type HubClaimGraph } from './hubClaimGraph'
import { hashDataHubLedger } from './contentHash'

export interface HubClaimsPackHandoff {
  schemaVersion: 1
  kind: 'biointel-hub-claims-pack'
  subjectId: string
  subjectLabel: string
  contentHash: string
  exportedAt: string
  claims: EvidenceClaim[]
  edgeCount: number
  notes: string[]
}

export function hubLedgerToPackClaimsHandoff(
  ledger: DataHubLedger,
  opts?: { maxClaims?: number },
): HubClaimsPackHandoff {
  const graph: HubClaimGraph = buildHubClaimGraph(ledger, {
    maxClaims: opts?.maxClaims ?? 120,
  })
  return {
    schemaVersion: 1,
    kind: 'biointel-hub-claims-pack',
    subjectId: ledger.subjectId,
    subjectLabel: ledger.subjectLabel,
    contentHash: hashDataHubLedger(ledger),
    exportedAt: new Date().toISOString(),
    claims: graph.claims,
    edgeCount: graph.edges.length,
    notes: [
      ...graph.notes,
      'Import into board pack as claim-bound evidence (do not invent claim ids).',
      'AI may only rephrase over these claim ids when used with pack AI.',
    ],
  }
}

export function hubClaimsPackToJson(handoff: HubClaimsPackHandoff): string {
  return JSON.stringify(handoff, null, 2)
}
