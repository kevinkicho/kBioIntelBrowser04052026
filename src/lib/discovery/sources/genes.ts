/**
 * Disease → gene/target gather (Open Targets + DisGeNET supporting).
 * Single shared fetch per rank: reuse genes for scoring + DGIdb symbols.
 */

import { getTargetsForDisease } from '../../api/opentargets'
import { getGenesByDisease } from '../../api/disgenet'
import type { SourceFetchStatus } from '../../dataStatus'
import type { DiseaseGene } from '../types'
import { hasDataArray, withSourceStatus } from '../sourceStatus'

export const MAX_DGIDB_GENES = 8

export interface GatherGenesResult {
  genes: DiseaseGene[]
  statuses: SourceFetchStatus[]
}

/**
 * Merge OT + DisGeNET disease-gene associations (once per rank).
 * OT is core; DisGeNET is supporting (never blocks).
 * Callers derive DGIdb symbols via `geneSymbolsForDgidb` — do not re-fetch.
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
 * Pure: top gene symbols for DGIdb from an already-gathered DiseaseGene list.
 * Priority: user pins → Open Targets (core) → other supporting sources by score.
 * Pins positively bias gene→drug gather without inventing disease associations.
 */
export function geneSymbolsForDgidb(
  genes: DiseaseGene[],
  max: number = MAX_DGIDB_GENES,
): string[] {
  if (genes.length === 0 || max <= 0) return []

  const symbols: string[] = []
  const seen = new Set<string>()

  const push = (sym: string | undefined) => {
    if (!sym) return false
    const key = sym.toUpperCase()
    if (seen.has(key)) return false
    seen.add(key)
    symbols.push(sym)
    return symbols.length >= max
  }

  // 1) User-pinned targets first (strong positive bias for drug gather)
  for (const g of genes) {
    if (g.source !== 'pinned-target') continue
    if (push(g.symbol)) return symbols
  }

  // 2) Open Targets (core disease associations)
  for (const g of genes) {
    if (!g.source.startsWith('Open Targets')) continue
    if (push(g.symbol)) return symbols
  }

  // 3) Supporting sources (DisGeNET, etc.) — already score-sorted overall
  for (const g of genes) {
    if (g.source === 'pinned-target' || g.source.startsWith('Open Targets')) continue
    if (push(g.symbol)) return symbols
  }

  return symbols
}

/** Genes from public DBs only (exclude synthetic user pins). */
export function diseaseAssociationGenesOnly(genes: DiseaseGene[]): DiseaseGene[] {
  return genes.filter((g) => g.source !== 'pinned-target')
}
