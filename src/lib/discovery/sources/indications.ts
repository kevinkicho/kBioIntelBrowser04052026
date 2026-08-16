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

function mapIndicationRows(
  indications: Array<{
    meshHeading?: string
    efoTerm?: string
    maxPhaseForIndication?: number
  }>,
): IndicationRow[] {
  return (indications ?? []).map((ind) => ({
    meshHeading: ind.meshHeading ?? '',
    efoTerm: ind.efoTerm ?? '',
    maxPhaseForIndication: ind.maxPhaseForIndication ?? 0,
  }))
}

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
      const settled = await Promise.allSettled(
        names.map(async (name) => {
          const indications = await getChemblIndicationsByName(name)
          return { name, indications }
        }),
      )

      const fulfilled = settled.filter(
        (r): r is PromiseFulfilledResult<{ name: string; indications: Awaited<ReturnType<typeof getChemblIndicationsByName>> }> =>
          r.status === 'fulfilled',
      )
      const rejected = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected')

      const indicationMap = new Map<string, IndicationRow[]>()
      for (const r of fulfilled) {
        indicationMap.set(r.value.name, mapIndicationRows(r.value.indications))
      }

      const hasRows = Array.from(indicationMap.values()).some((rows) => rows.length > 0)
      if (!hasRows && rejected.length > 0) {
        const reason = rejected[0].reason
        throw reason instanceof Error ? reason : new Error(String(reason))
      }

      return indicationMap
    },
    {
      fallback: new Map<string, IndicationRow[]>(),
      hasData: (m) => Array.from(m.values()).some((rows) => rows.length > 0),
    },
  )

  return { indicationMap: result.value, status: result.status }
}