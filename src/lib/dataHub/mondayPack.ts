/**
 * Monday pack: one-shot research handoff = kit bundle + claims + methodology pointer.
 */

import type { EvidenceClaim } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import { AI_PROVENANCE_HONESTY } from '@/lib/ai/aiProvenance'
import { API_PROVENANCE_HONESTY } from '@/lib/provenance/apiContent'
import {
  buildResearchKitBundle,
  type ResearchKitBundle,
  type ResearchKitInput,
} from './researchKit'
import type { DataHubLedger } from './types'

export interface MondayPackInput extends ResearchKitInput {
  /** Optional disease/context for title */
  contextLabel?: string | null
  /** ISO date override for tests */
  asOf?: string
}

export interface MondayPackDocument {
  schemaVersion: 2
  kind: 'biointel-monday-pack'
  title: string
  subjectId: string
  subjectLabel: string
  exportedAt: string
  methodologyUrl: string
  honesty: string[]
  kit: ResearchKitBundle
  claimCount: number
  /** Short agenda bullets for lab meeting */
  agenda: string[]
  /** Dual provenance for lab handoff */
  provenance?: {
    api: {
      factCount: number
      sourceCount: number
      honesty: string[]
    }
    ai: {
      honesty: string[]
      note: string
    }
  }
  /** Optional open links for Monday work */
  openLinks?: Array<{ label: string; href: string }>
}

export function buildMondayPackTitle(
  ledger: DataHubLedger,
  contextLabel?: string | null,
  asOf?: string,
): string {
  const day = (asOf || new Date().toISOString()).slice(0, 10)
  const ctx = contextLabel?.trim()
  return ctx
    ? `Monday research pack — ${ledger.subjectLabel} · ${ctx} · ${day}`
    : `Monday research pack — ${ledger.subjectLabel} · ${day}`
}

export function buildMondayPackAgenda(
  ledger: DataHubLedger,
  claims: readonly EvidenceClaim[] | null | undefined,
): string[] {
  const filled = ledger.rows.filter((r) => r.value && r.value !== '—').length
  return [
    `Review of-record data hub (${filled} facts · ${ledger.sourceCount} sources)`,
    'Open primary registry links for any decision-critical rows',
    claims && claims.length > 0
      ? `Walk claim-bound evidence (${claims.length} statements)`
      : 'Load Core panels / board pack if claims are needed',
    'Confirm identity keys (CID / InChIKey / ChEMBL) before wet-lab',
    'Not clinical or regulatory decision support — verify upstream',
  ]
}

export function buildMondayPack(input: MondayPackInput): MondayPackDocument {
  const kit = buildResearchKitBundle({
    ...input,
    includePrefs: input.includePrefs ?? true,
  })
  const claims = input.claims ?? []
  const exportedAt = input.asOf || new Date().toISOString()
  const filled = input.ledger.rows.filter((r) => r.value && r.value !== '—').length
  const sid = input.ledger.subjectId
  return {
    schemaVersion: 2,
    kind: 'biointel-monday-pack',
    title: buildMondayPackTitle(input.ledger, input.contextLabel, exportedAt),
    subjectId: input.ledger.subjectId,
    subjectLabel: input.ledger.subjectLabel,
    exportedAt,
    methodologyUrl: '/methodology',
    honesty: [
      'Free public APIs only',
      'Session samples not universe counts',
      'Not clinical or regulatory decision support',
      'Optional AI elsewhere is non-of-record',
    ],
    kit,
    claimCount: claims.length,
    agenda: buildMondayPackAgenda(input.ledger, claims),
    provenance: {
      api: {
        factCount: filled,
        sourceCount: input.ledger.sourceCount,
        honesty: [...API_PROVENANCE_HONESTY],
      },
      ai: {
        honesty: [...AI_PROVENANCE_HONESTY],
        note: 'Any AI briefs attached separately must include promptSystem/promptUser; this pack is of-record kit first.',
      },
    },
    openLinks: [
      {
        label: 'Molecule research view',
        href: `/molecule/${encodeURIComponent(sid)}?view=research`,
      },
      {
        label: 'Methodology · honesty',
        href: '/methodology#honesty',
      },
      {
        label: 'Methodology · provenance',
        href: '/methodology#provenance',
      },
    ],
  }
}

export function downloadMondayPack(input: MondayPackInput): MondayPackDocument {
  const doc = buildMondayPack(input)
  const slug = (doc.subjectLabel || 'entity')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const name = `biointel-monday-pack-${slug}-${doc.subjectId}.json`
  downloadFile(JSON.stringify(doc, null, 2), name, 'application/json;charset=utf-8')
  return doc
}
