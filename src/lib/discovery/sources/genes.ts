/**
 * Disease → gene/target gather (Open Targets + DisGeNET supporting).
 */

import { getTargetsForDisease } from '../../api/opentargets'
import { getGenesByDisease } from '../../api/disgenet'
import type { SourceFetchStatus } from '../../dataStatus'
import type { DiseaseGene } from '../types'
import { hasDataArray, withSourceStatus } from '../sourceStatus'

export interface GatherGenesResult {
  genes: DiseaseGene[]
  statuses: SourceFetchStatus[]
}

/**
 * Merge OT + DisGeNET disease-gene associations.
 * OT is core; DisGeNET is supporting (never blocks).
 */
export async function gatherDiseaseGenes(
  diseaseId: string | null,
  diseaseName: string,
): Promise<GatherGenesResult> {
  const geneMap = new Map<string, DiseaseGene>()
  const statuses: SourceFetchStatus[] = []

  const ot = await withSourceStatus(
    'Open Targets (targets)',
    async () => (diseaseId ? getTargetsForDisease(diseaseId) : []),
    {
      fallback: [],
      hasData: hasDataArray,
    },
  )
  statuses.push(
    diseaseId
      ? ot.status
      : {
          source: 'Open Targets (targets)',
          status: 'empty',
          has_data: false,
          error: 'No disease id — skipped OT target lookup',
        },
  )

  for (const t of ot.value) {
    const symbol = t.name.split(' ')[0].toUpperCase()
    if (!symbol) continue
    const existing = geneMap.get(symbol)
    if (!existing || existing.score < t.overallScore) {
      geneMap.set(symbol, { symbol, score: t.overallScore, source: 'Open Targets' })
    }
  }

  const dg = await withSourceStatus(
    'DisGeNET (genes)',
    () => getGenesByDisease(diseaseName),
    {
      fallback: [],
      hasData: hasDataArray,
    },
  )
  statuses.push(dg.status)

  for (const g of dg.value) {
    const symbol = g.geneSymbol.toUpperCase()
    if (!symbol) continue
    const existing = geneMap.get(symbol)
    if (!existing || existing.score < g.score) {
      geneMap.set(symbol, {
        symbol,
        score: g.score,
        source: `DisGeNET (${g.source})`,
      })
    }
  }

  const genes = Array.from(geneMap.values()).sort((a, b) => b.score - a.score)
  return { genes, statuses }
}

/**
 * Collect top gene symbols for DGIdb ligand lookup (max 8).
 */
export async function gatherGeneSymbolsForTargets(
  diseaseId: string | null,
  diseaseName: string,
): Promise<{ genes: string[]; statuses: SourceFetchStatus[] }> {
  const genes: string[] = []
  const statuses: SourceFetchStatus[] = []

  if (diseaseId) {
    const ot = await withSourceStatus(
      'Open Targets (target→genes)',
      () => getTargetsForDisease(diseaseId),
      { fallback: [], hasData: hasDataArray },
    )
    statuses.push(ot.status)
    for (const t of ot.value.slice(0, 8)) {
      const symbol = t.name.split(' ')[0]
      if (symbol && !genes.includes(symbol)) genes.push(symbol)
    }
  } else {
    statuses.push({
      source: 'Open Targets (target→genes)',
      status: 'empty',
      has_data: false,
      error: 'No disease id',
    })
  }

  const dg = await withSourceStatus(
    'DisGeNET (target→genes)',
    () => getGenesByDisease(diseaseName),
    { fallback: [], hasData: hasDataArray },
  )
  statuses.push(dg.status)
  for (const g of dg.value.slice(0, 8)) {
    if (g.geneSymbol && !genes.includes(g.geneSymbol)) genes.push(g.geneSymbol)
  }

  return { genes: genes.slice(0, 8), statuses }
}
