/**
 * Of-record Discover shortlist CSV — axes + harvest status + identity.
 */

import type { RankResult } from './types'

function esc(s: string): string {
  return `"${String(s).replace(/"/g, '""')}"`
}

/**
 * Dense of-record shortlist CSV including multi-axis scores when v2 present.
 */
export function exportDiscoverShortlistCsv(result: RankResult): string {
  const lines: string[] = []
  lines.push(`# BioIntel Discover shortlist (of-record, deterministic)`)
  lines.push(`# Disease: ${result.diseaseName}`)
  lines.push(`# Disease ID: ${result.diseaseId ?? 'N/A'}`)
  lines.push(`# Generated: ${result.generatedAt ?? ''}`)
  lines.push(`# Score phase: ${result.v2?.scorePhase ?? 'cheap'}`)
  lines.push(`# Genes: ${result.genes.map((g) => g.symbol).join('; ')}`)
  lines.push(
    `# Note: Empty safety ≠ safe. FAERS counts are reports not incidence. Not clinical decision support.`,
  )
  lines.push('')

  const headers = [
    'rank',
    'name',
    'cid',
    'inchiKey',
    'identityTrust',
    'composite',
    'efficacy',
    'clinicalStage',
    'safety',
    'safetyStatus',
    'novelty',
    'noveltyStatus',
    'clinicalPhaseRaw',
    'trialCountRaw',
    'sharedTargetCountRaw',
    'geneAssociationScore',
    'sources',
    'confidence',
    'scorePhase',
  ]
  lines.push(headers.join(','))

  const v2ByName = new Map(
    (result.v2?.candidates ?? []).map((c) => [c.identity.name.toLowerCase(), c]),
  )

  result.candidates.forEach((c, i) => {
    const mc = v2ByName.get(c.name.toLowerCase())
    const s = mc?.scores
    const row = [
      i + 1,
      esc(c.name),
      c.cid ?? mc?.identity.pubchemCid ?? '',
      mc?.identity.inchiKey ?? '',
      s?.axes.identityTrust != null ? s.axes.identityTrust.toFixed(4) : '',
      (s?.composite ?? c.compositeScore).toFixed(4),
      s?.axes.efficacy != null ? s.axes.efficacy.toFixed(4) : '',
      s?.axes.clinicalStage != null ? s.axes.clinicalStage.toFixed(4) : '',
      s?.axes.safety != null ? s.axes.safety.toFixed(4) : '',
      s?.axisStatus.safety ?? 'not-retrieved',
      s?.axes.novelty != null ? s.axes.novelty.toFixed(4) : '',
      s?.axisStatus.novelty ?? 'not-retrieved',
      c.clinicalPhaseRaw,
      c.trialCountRaw,
      c.sharedTargetCountRaw,
      c.geneAssociationScore.toFixed(4),
      esc(c.sources.join('; ')),
      c.confidence,
      s?.scorePhase ?? result.v2?.scorePhase ?? 'cheap',
    ]
    lines.push(row.join(','))
  })

  return lines.join('\n')
}
