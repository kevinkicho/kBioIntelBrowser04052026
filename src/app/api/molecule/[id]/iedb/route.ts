import { NextRequest } from 'next/server'
import { getIEDBData } from '@/lib/api/iedb'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'epitopes',
    async (name) => {
      const resolved = await resolveDrugTargets(name, 5)
      const queries = [
        ...resolved.targetNames,
        ...resolved.geneSymbols,
        name,
      ].filter(Boolean)

      const allEpitopes: unknown[] = []
      const seen = new Set<number>()
      for (const q of queries.slice(0, 4)) {
        const data = await getIEDBData(q)
        for (const e of data.epitopes ?? []) {
          if (seen.has(e.epitopeId)) continue
          seen.add(e.epitopeId)
          allEpitopes.push(e)
        }
        if (allEpitopes.length >= 10) break
      }
      return allEpitopes.slice(0, 25)
    },
    { source: 'iedb' },
  )
}
