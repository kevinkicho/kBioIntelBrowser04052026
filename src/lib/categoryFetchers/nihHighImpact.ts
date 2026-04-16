import { trackedSafe } from '@/lib/api-tracker'

import { fetchTranslatorData } from '@/lib/api/ncats-translator'
import { fetchCadsrData } from '@/lib/api/nci-cadsr'
import { fetchAnvilData } from '@/lib/api/nhgri-anvil'
import { fetchImmPortData } from '@/lib/api/niaid-immport'
import { fetchNeuroMMSigData } from '@/lib/api/ninds-neurommsig'

export async function fetchNihHighImpact(name: string, queryFor: (s: string) => string) {
  const [translatorData, cadsrData, anvilData, immPortData, neuroMMSigData] = await Promise.all([
    trackedSafe('ncats-translator', fetchTranslatorData(queryFor('ncats-translator')), null),
    trackedSafe('nci-cadsr', fetchCadsrData(queryFor('nci-cadsr')), null),
    trackedSafe('nhgri-anvil', fetchAnvilData(queryFor('nhgri-anvil')), null),
    trackedSafe('niaid-immport', fetchImmPortData(queryFor('niaid-immport')), null),
    trackedSafe('ninds-neurommsig', fetchNeuroMMSigData(queryFor('ninds-neurommsig')), null),
  ])
  return { translatorData, cadsrData, anvilData, immPortData, neuroMMSigData }
}