import { trackedSafe } from '@/lib/api-tracker'
import { isApiSourceDisabled } from '@/lib/api/sourceAvailability'

import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

/**
 * NIH High-Impact category. Disabled sources (see sourceAvailability) short-circuit
 * to empty without network calls so they don't burn timeout budget or log noise.
 */
export async function fetchNihHighImpact(name: string, queryFor: (s: string) => string) {
  const tasks: Array<Promise<unknown>> = []

  // Always call disabled clients through trackedSafe so analytics still records
  // empty panels — they return immediately without fetch.
  tasks.push(
    isApiSourceDisabled('ncats-translator')
      ? Promise.resolve(null)
      : trackedSafe('ncats-translator', fetchTranslatorData(queryFor('ncats-translator')), null),
  )
  tasks.push(
    trackedSafe('nci-cadsr', fetchCadsrData(queryFor('nci-cadsr')), null),
  )
  tasks.push(
    isApiSourceDisabled('nhgri-anvil')
      ? Promise.resolve(null)
      : trackedSafe('nhgri-anvil', fetchAnvilData(queryFor('nhgri-anvil')), null),
  )
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
