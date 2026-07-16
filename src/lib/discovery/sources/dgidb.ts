/**
 * Gene → drug gather via DGIdb (core).
 * Expects gene symbols from shared `gatherDiseaseGenes` (no OT/DisGeNET re-fetch).
 */

import {
  getTargetRelatedMolecules,
  type TargetRelatedMolecule,
} from '../../api/dgidb'
import type { SourceFetchStatus } from '../../dataStatus'
import { hasDataArray, withSourceStatus } from '../sourceStatus'
import { geneSymbolsForDgidb, MAX_DGIDB_GENES } from './genes'
import type { DiseaseGene } from '../types'

export interface GatherTargetMoleculesResult {
  molecules: TargetRelatedMolecule[]
  statuses: SourceFetchStatus[]
  /** Symbols actually sent to DGIdb (for tests / telemetry). */
  geneSymbolsUsed: string[]
}

/**
 * Resolve pre-gathered disease genes → DGIdb interacting drugs.
 * Does **not** re-fetch OT/DisGeNET and does **not** use getDrugsForDisease (PR3b).
 */
export async function gatherTargetMolecules(
  genes: DiseaseGene[],
  opts?: { maxGenes?: number },
): Promise<GatherTargetMoleculesResult> {
  const geneSymbols = geneSymbolsForDgidb(genes, opts?.maxGenes ?? MAX_DGIDB_GENES)

  if (geneSymbols.length === 0) {
    return {
      molecules: [],
      geneSymbolsUsed: [],
      statuses: [
        {
          source: 'DGIdb',
          status: 'empty',
          has_data: false,
          error: 'No gene symbols available for DGIdb lookup',
        },
      ],
    }
  }

  const dgidb = await withSourceStatus(
    'DGIdb',
    () => getTargetRelatedMolecules(geneSymbols, ''),
    { fallback: [], hasData: hasDataArray },
  )

  return {
    molecules: dgidb.value,
    geneSymbolsUsed: geneSymbols,
    statuses: [dgidb.status],
  }
}
