/**
 * Open Targets known drugs / clinical candidates gather (PR3b).
 * Uses drugAndClinicalCandidates GraphQL (Platform 26.x successor to knownDrugs).
 */

import {
  getKnownDrugsForDisease,
  type KnownDrugForDisease,
} from '../../api/opentargets'
import type { SourceFetchStatus } from '../../dataStatus'
import { hasDataArray, withSourceStatus } from '../sourceStatus'

export const MAX_KNOWN_DRUGS = 40

export interface GatherKnownDrugsResult {
  drugs: KnownDrugForDisease[]
  /** Unique preferred names for candidate union. */
  names: string[]
  status: SourceFetchStatus
}

/**
 * Disease id → real OT known drugs (never target/protein names).
 * Skips cleanly when diseaseId is missing.
 */
export async function gatherOpenTargetsKnownDrugs(
  diseaseId: string | null,
  opts?: { limit?: number },
): Promise<GatherKnownDrugsResult> {
  const limit = opts?.limit ?? MAX_KNOWN_DRUGS

  if (!diseaseId) {
    return {
      drugs: [],
      names: [],
      status: {
        source: 'Open Targets (knownDrugs)',
        status: 'empty',
        has_data: false,
        error: 'No disease id — skipped knownDrugs lookup',
      },
    }
  }

  const result = await withSourceStatus(
    'Open Targets (knownDrugs)',
    () => getKnownDrugsForDisease(diseaseId, limit),
    { fallback: [] as KnownDrugForDisease[], hasData: hasDataArray },
  )

  const names = result.value.map((d) => d.name).filter(Boolean)

  return {
    drugs: result.value,
    names,
    status: result.status,
  }
}
