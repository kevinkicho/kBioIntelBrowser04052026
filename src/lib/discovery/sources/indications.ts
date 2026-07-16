/**
 * ChEMBL indication enrichment for top candidate names (latency-capped).
 */

import { getChemblIndicationsByName } from '../../api/chembl-indications'
import type { SourceFetchStatus } from '../../dataStatus'
import { withSourceStatus } from '../sourceStatus'

export type IndicationRow = {
  meshHeading: string
  efoTerm: string
  maxPhaseForIndication: number
}

export interface GatherIndicationsResult {
  indicationMap: Map<string, IndicationRow[]>
  status: SourceFetchStatus
}

const MAX_INDICATION_LOOKUPS = 20

export async function gatherChemblIndications(
  moleculeNames: string[],
): Promise<GatherIndicationsResult> {
  const names = moleculeNames.slice(0, MAX_INDICATION_LOOKUPS)
  if (names.length === 0) {
    return {
      indicationMap: new Map(),
      status: {
        source: 'ChEMBL (indications)',
        status: 'empty',
        has_data: false,
      },
    }
  }

  const result = await withSourceStatus(
    'ChEMBL (indications)',
    async () => {
      const indicationMap = new Map<string, IndicationRow[]>()
      const settled = await Promise.allSettled(
        names.map(async (name) => {
          try {
            const indications = await getChemblIndicationsByName(name)
            return { name, indications }
          } catch {
            return { name, indications: [] as IndicationRow[] }
          }
        }),
      )
      for (const r of settled) {
        if (r.status !== 'fulfilled') continue
        const mapped = (r.value.indications ?? []).map(
          (ind: {
            meshHeading?: string
            efoTerm?: string
            maxPhaseForIndication?: number
          }) => ({
            meshHeading: ind.meshHeading ?? '',
            efoTerm: ind.efoTerm ?? '',
            maxPhaseForIndication: ind.maxPhaseForIndication ?? 0,
          }),
        )
        indicationMap.set(r.value.name, mapped)
      }
      return indicationMap
    },
    {
      fallback: new Map<string, IndicationRow[]>(),
      hasData: (m) => {
        return Array.from(m.values()).some((rows) => rows.length > 0)
      },
    },
  )

  return { indicationMap: result.value, status: result.status }
}
