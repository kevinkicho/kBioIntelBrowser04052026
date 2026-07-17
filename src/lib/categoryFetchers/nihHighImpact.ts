import { trackedSafe } from '@/lib/api-tracker'
import { isApiSourceDisabled } from '@/lib/api/sourceAvailability'

import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

/**
 * NIH High-Impact category.
 * nci-cadsr (EVS) and niaid-immport are live free paths; other sources may still
 * short-circuit via sourceAvailability when disabled.
 */
export async function fetchNihHighImpact(name: string, queryFor: (s: string) => string) {
  const tasks: Array<Promise<unknown>> = []

  tasks.push(
    isApiSourceDisabled('ncats-translator')
      ? Promise.resolve(null)
      : trackedSafe('ncats-translator', fetchTranslatorData(queryFor('ncats-translator')), null),
  )
  // Free NCI EVS REST (NCIt) — caDSR-adjacent panel
  tasks.push(
    trackedSafe('nci-cadsr', fetchCadsrData(queryFor('nci-cadsr')), null),
  )
  tasks.push(
    isApiSourceDisabled('nhgri-anvil')
      ? Promise.resolve(null)
      : trackedSafe('nhgri-anvil', fetchAnvilData(queryFor('nhgri-anvil')), null),
  )
  // Free ImmPort Shared Data Search API
  tasks.push(
    trackedSafe('niaid-immport', fetchImmPortData(queryFor('niaid-immport')), null),
  )
  tasks.push(
    isApiSourceDisabled('ninds-neurommsig')
      ? Promise.resolve(null)
      : trackedSafe('ninds-neurommsig', fetchNeuroMMSigData(queryFor('ninds-neurommsig')), null),
  )

  const [translatorData, cadsrData, anvilData, immPortData, neuroMMSigData] = await Promise.all(tasks)
  return { translatorData, cadsrData, anvilData, immPortData, neuroMMSigData }
}
