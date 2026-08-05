/**
 * Pack → Monday single handoff document (finish-rate).
 * Pure builder; download/seed are callers' side effects.
 */

import type { EvidencePack } from './pack'
import { summarizePackHonesty } from './packHonesty'
import {
  mondayTemplatesForPersona,
  type MondayExperimentTemplate,
} from '@/lib/dataHub/mondayExperimentLibrary'
import type { CampaignPersona } from '@/lib/campaign/campaignWorkspace'

export interface MondayHandoffDocument {
  schemaVersion: 1
  kind: 'biointel-monday-handoff'
  title: string
  exportedAt: string
  packId: string
  packTitle: string
  contentHash: string
  projectId?: string
  claimCount: number
  citableCount: number
  honesty: ReturnType<typeof summarizePackHonesty>
  experiments: Array<{
    id: string
    title: string
    description: string
    freeApiSurfaces: string[]
    costTier: MondayExperimentTemplate['costTier']
    experimentType: MondayExperimentTemplate['experimentType']
    lawReminder: string
  }>
  openLinks: Array<{ label: string; href: string }>
  law: string[]
}

export function buildMondayHandoff(
  pack: EvidencePack,
  opts?: {
    persona?: CampaignPersona
    asOf?: string
  },
): MondayHandoffDocument {
  const persona = opts?.persona ?? 'repurposing'
  const honesty = summarizePackHonesty(pack.claims)
  const experiments = mondayTemplatesForPersona(persona).slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    freeApiSurfaces: [...t.freeApiSurfaces],
    costTier: t.costTier,
    experimentType: t.experimentType,
    lawReminder: t.lawReminder,
  }))
  const cid =
    pack.candidates.find((c) => c.identity?.pubchemCid != null)?.identity?.pubchemCid ?? null
  const openLinks: MondayHandoffDocument['openLinks'] = [
    { label: 'Projects board', href: pack.projectId ? `/projects/${pack.projectId}` : '/projects' },
    { label: 'Campaign workspace', href: '/campaign' },
    { label: 'Methodology · honesty', href: '/methodology#honesty' },
  ]
  if (cid != null) {
    openLinks.unshift({
      label: 'Molecule research view',
      href: `/molecule/${cid}?view=research`,
    })
  }
  return {
    schemaVersion: 1,
    kind: 'biointel-monday-handoff',
    title: `Monday handoff — ${pack.title}`,
    exportedAt: opts?.asOf || new Date().toISOString(),
    packId: pack.id,
    packTitle: pack.title,
    contentHash: pack.contentHash,
    projectId: pack.projectId,
    claimCount: pack.claimCount,
    citableCount: honesty.citableCount,
    honesty,
    experiments,
    openLinks,
    law: [
      'Free public APIs only',
      'Of-record pack claims only in this handoff — optional AI is non-of-record annex',
      'Not clinical or regulatory decision support',
      'User verifies primary sources before wet-lab / grant',
    ],
  }
}

export function mondayHandoffToJson(doc: MondayHandoffDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function mondayHandoffFilename(doc: MondayHandoffDocument): string {
  const slug = (doc.packTitle || 'pack')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `biointel-monday-handoff-${slug}-${doc.packId.slice(0, 12)}.json`
}
