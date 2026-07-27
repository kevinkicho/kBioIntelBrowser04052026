/**
 * Job-specific dense evidence packs for AI prompts.
 * Prefer named rows with registry ids over count-only summaries.
 */

import type { MoleculeContext } from './context/types'
import type { SessionMoleculeSummary } from './prompts/types'
import { formatGroundingForPrompt, type EvidenceGroundingStats } from './evidenceDensity'

const SYNTHESIS_MAX_CHARS = 28_000

export type EvidencePackKind =
  | 'synthesis'
  | 'safety'
  | 'prior_art'
  | 'mechanism'
  | 'gap'

function clip(s: string, n: number): string {
  const t = s.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

/** Dense pack for safety memo / deep-dive — tables with ids. */
export function buildSafetyEvidencePack(ctx: MoleculeContext): string {
  const lines: string[] = []
  lines.push(`SAFETY EVIDENCE PACK — ${ctx.identity.name} (CID ${ctx.identity.cid})`)
  lines.push(`Overall risk heuristic: ${ctx.safety.overallRisk} | Boxed warning flag: ${ctx.safety.hasBoxedWarning ? 'YES' : 'no'}`)
  lines.push('')

  lines.push('## Mechanisms (link AEs to on-target when possible)')
  if (ctx.rich.mechanismDetails.length === 0) {
    lines.push('(none loaded — do not invent MoA)')
  } else {
    for (const m of ctx.rich.mechanismDetails.slice(0, 12)) {
      lines.push(
        `- MoA: ${m.mechanismOfAction} | target=${m.targetName} | action=${m.actionType} | maxPhase=${m.maxPhase === -1 ? '?' : m.maxPhase} | direct=${m.directInteraction}`,
      )
    }
  }

  lines.push('')
  lines.push('## Target potencies (top by pChEMBL)')
  if (ctx.rich.topTargetActivities.length === 0) {
    lines.push('(none loaded)')
  } else {
    for (const a of ctx.rich.topTargetActivities.slice(0, 20)) {
      lines.push(
        `- ${a.targetName} (${a.targetOrganism || '?'}) ${a.standardType}=${a.standardValue} ${a.standardUnits}${a.pchemblValue != null ? ` pChEMBL=${a.pchemblValue}` : ''} [chembl]`,
      )
    }
  }

  lines.push('')
  lines.push('## Adverse events (FAERS-style counts — reports, NOT incidence)')
  if (ctx.rich.topAdverseEvents.length === 0) {
    lines.push('(none loaded)')
  } else {
    for (const ae of ctx.rich.topAdverseEvents.slice(0, 20)) {
      lines.push(
        `- ${ae.reactionName}: ${ae.count} reports (${ae.serious} serious)${ae.outcome ? ` outcome=${ae.outcome}` : ''} [adverse-events]`,
      )
    }
  }

  lines.push('')
  lines.push('## SIDER labels (if any)')
  if (ctx.rich.siderSideEffects.length === 0) lines.push('(none)')
  else lines.push(ctx.rich.siderSideEffects.slice(0, 25).join('; '))

  lines.push('')
  lines.push('## Recalls')
  if (ctx.rich.recallDetails.length === 0) lines.push('(none loaded)')
  else {
    for (const r of ctx.rich.recallDetails.slice(0, 10)) {
      lines.push(`- [${r.classification}] ${clip(r.reason, 160)} | firm=${r.recallingFirm} | ${r.recallDate} [recalls]`)
    }
  }

  lines.push('')
  lines.push('## Drug–drug interactions (sample)')
  if (ctx.rich.drugInteractionDetails.length === 0) lines.push('(none loaded)')
  else {
    for (const di of ctx.rich.drugInteractionDetails.slice(0, 12)) {
      lines.push(`- ${di.drugName} [${di.severity}]: ${clip(di.description, 140)}`)
    }
  }

  lines.push('')
  lines.push('## Pharmacogenomic genes')
  lines.push(
    ctx.rich.pharmacogenomicGenes.length
      ? ctx.rich.pharmacogenomicGenes.join(', ')
      : '(none loaded)',
  )

  lines.push('')
  lines.push(
    'RULES: FAERS counts are spontaneous reports not rates. Connect AE to MoA only when both sides have named rows. Label unexplained AEs as unexplained.',
  )
  return lines.join('\n')
}

/** Dense pack for prior-art / patent Boolean queries. */
export function buildPriorArtEvidencePack(ctx: MoleculeContext): string {
  const lines: string[] = []
  lines.push(`PRIOR-ART EVIDENCE — ${ctx.identity.name}`)
  lines.push(`CID: ${ctx.identity.cid}`)
  if (ctx.identity.inchiKey) lines.push(`InChIKey: ${ctx.identity.inchiKey}`)
  const syn = (ctx.identity.synonyms ?? []).slice(0, 12)
  lines.push(`Synonyms: ${syn.length ? syn.join(' | ') : '(none in bag)'}`)
  lines.push('')
  lines.push('Targets:')
  for (const t of ctx.rich.topTargetActivities.slice(0, 12)) {
    lines.push(`- ${t.targetName}`)
  }
  if (!ctx.rich.topTargetActivities.length) lines.push('(none)')
  lines.push('')
  lines.push('Mechanisms:')
  for (const m of ctx.rich.mechanismDetails.slice(0, 10)) {
    lines.push(`- ${m.mechanismOfAction} (${m.targetName})`)
  }
  if (!ctx.rich.mechanismDetails.length) lines.push('(none)')
  lines.push('')
  lines.push('Indications / conditions:')
  for (const i of ctx.rich.indicationDetails.slice(0, 12)) {
    lines.push(`- ${i.condition} (phase ${i.maxPhase === -1 ? '?' : i.maxPhase})`)
  }
  if (!ctx.rich.indicationDetails.length) lines.push('(none)')
  lines.push('')
  lines.push('Patents (sample titles):')
  for (const p of ctx.rich.patentDetails.slice(0, 8)) {
    lines.push(`- ${p.patentNumber}: ${clip(p.title, 100)}`)
  }
  if (!ctx.rich.patentDetails.length) lines.push('(none)')
  return lines.join('\n')
}

/** Full synthesis pack — denser than default context block. */
export function buildSynthesisEvidencePack(
  ctx: MoleculeContext,
  grounding: EvidenceGroundingStats,
  maxChars: number = SYNTHESIS_MAX_CHARS,
): string {
  const chunks: string[] = []
  chunks.push(formatGroundingForPrompt(grounding))
  chunks.push('')
  chunks.push(buildSafetyEvidencePack(ctx))
  chunks.push('')

  const lines: string[] = []
  lines.push('## Clinical trials (named NCT when present)')
  if (!ctx.rich.trialDetails.length) lines.push('(none loaded)')
  else {
    for (const t of ctx.rich.trialDetails.slice(0, 20)) {
      lines.push(
        `- ${t.nctId || 'NCT?'} | ${t.phase} | ${t.status} | ${clip(t.title, 100)} | sponsor=${t.sponsor} | cond=${(t.conditions || []).slice(0, 3).join(', ')} [clinical-trials]`,
      )
    }
  }

  lines.push('')
  lines.push('## Disease / gene associations')
  if (!ctx.rich.diseaseAssociations.length) lines.push('(none loaded)')
  else {
    for (const d of ctx.rich.diseaseAssociations.slice(0, 15)) {
      lines.push(
        `- ${d.diseaseName} gene=${d.geneSymbol || '?'} score=${d.score} [${(d.sources || []).join(',')}]`,
      )
    }
  }

  lines.push('')
  lines.push('## Pathways')
  lines.push(
    ctx.rich.pathwayNames.length
      ? ctx.rich.pathwayNames
          .slice(0, 15)
          .map((p) => `${p.name}[${p.source}]`)
          .join('; ')
      : '(none)',
  )

  lines.push('')
  lines.push('## Literature samples')
  if (!ctx.rich.publicationDetails.length) lines.push('(none loaded)')
  else {
    for (const p of ctx.rich.publicationDetails.slice(0, 12)) {
      lines.push(
        `- ${clip(p.title || '', 120)} (${p.year || '?'}) ${p.doi || ''} [literature]`,
      )
    }
  }

  lines.push('')
  lines.push('## Chemical')
  lines.push(
    `MW=${ctx.chemical.molecularWeight ?? '?'} LogP=${ctx.chemical.logP ?? '?'} Lipinski=${String(ctx.chemical.followsLipinski)}`,
  )
  lines.push(
    `UniProt=${ctx.structural.uniprotEntryCount} PDB=${ctx.structural.pdbStructureCount} AlphaFold=${ctx.structural.hasAlphaFold}`,
  )

  chunks.push(lines.join('\n'))
  let out = chunks.join('\n')
  if (out.length > maxChars) {
    out = `${out.slice(0, maxChars)}\n…[truncated for model context]`
  }
  return out
}

export function buildDiffSafetyPack(
  ctx: MoleculeContext,
  other: SessionMoleculeSummary,
): string {
  return [
    buildSafetyEvidencePack(ctx),
    '',
    `## COMPARISON SESSION MOLECULE: ${other.name}`,
    `Targets: ${(other.topTargets || []).slice(0, 8).join(', ') || '(none in session summary)'}`,
    `AEs: ${(other.topAEs || []).slice(0, 8).join('; ') || '(none)'}`,
    `Mechanisms: ${(other.mechanisms || []).slice(0, 6).join('; ') || '(none)'}`,
    `Indications: ${(other.indications || []).slice(0, 6).join(', ') || '(none)'}`,
    'Note: comparison molecule data is a session summary only — thinner than current profile bags.',
  ].join('\n')
}
