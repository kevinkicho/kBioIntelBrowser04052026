/**
 * ClinicalTrials.gov intervention gather (core).
 */

import {
  searchClinicalTrialsByCondition,
  extractDrugInterventions,
} from '../../api/clinicaltrials'
import type { SourceFetchStatus } from '../../dataStatus'
import { hasDataMap, withSourceStatus } from '../sourceStatus'

export interface GatherTrialDrugsResult {
  drugCounts: Map<string, number>
  status: SourceFetchStatus
}

export async function gatherTrialDrugs(diseaseName: string): Promise<GatherTrialDrugsResult> {
  const result = await withSourceStatus(
    'ClinicalTrials.gov',
    async () => {
      const trials = await searchClinicalTrialsByCondition(diseaseName, 50)
      const drugInterventions = extractDrugInterventions(trials)
      const drugCounts = new Map<string, number>()
      for (const d of drugInterventions) {
        drugCounts.set(d.name, d.trialCount)
      }
      return drugCounts
    },
    {
      fallback: new Map<string, number>(),
      hasData: hasDataMap,
    },
  )

  return { drugCounts: result.value, status: result.status }
}
