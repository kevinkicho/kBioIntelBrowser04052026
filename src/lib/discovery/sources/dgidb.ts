/**
 * Gene → drug gather via DGIdb (core).
 */

import {
  getTargetRelatedMolecules,
  type TargetRelatedMolecule,
} from '../../api/dgidb'
import type { SourceFetchStatus } from '../../dataStatus'
import { hasDataArray, withSourceStatus } from '../sourceStatus'
import { gatherGeneSymbolsForTargets } from './genes'

export interface GatherTargetMoleculesResult {
  molecules: TargetRelatedMolecule[]
  statuses: SourceFetchStatus[]
}

/**
 * Resolve disease genes → DGIdb interacting drugs.
 * Does **not** use Open Targets getDrugsForDisease (returns target names — PR3b).
 */
export async function gatherTargetMolecules(
  diseaseId: string | null,
  diseaseName: string,
): Promise<GatherTargetMoleculesResult> {
  const { genes, statuses: geneStatuses } = await gatherGeneSymbolsForTargets(
    diseaseId,
    diseaseName,
  )

  if (genes.length === 0) {
    return {
      molecules: [],
      statuses: [
        ...geneStatuses,
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
    () => getTargetRelatedMolecules(genes, ''),
    { fallback: [], hasData: hasDataArray },
  )

  return {
    molecules: dgidb.value,
    statuses: [...geneStatuses, dgidb.status],
  }
}
