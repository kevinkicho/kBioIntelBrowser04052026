import { NextRequest } from 'next/server'
import { getOMIMData } from '@/lib/api/omim'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'entries',
    async (name) => {
      const resolved = await resolveDrugTargets(name, 4)
      const queries = [...resolved.geneSymbols, name].filter(Boolean)

      const allEntries: unknown[] = []
      const seen = new Set<number | string>()
      for (const q of queries.slice(0, 4)) {
        const data = await getOMIMData(q)
        for (const e of data.entries ?? []) {
          const key = e.mimNumber || e.name
          if (seen.has(key)) continue
          seen.add(key)
          allEntries.push(e)
        }
        if (allEntries.length >= 5) break
      }

      if (allEntries.length === 0) {
        try {
          const { getDiseaseAssociationsByName } = await import('@/lib/api/opentargets')
          const hits = await getDiseaseAssociationsByName(name)
          for (const h of hits.slice(0, 10)) {
            allEntries.push({
              mimNumber: 0,
              name: h.diseaseName || '',
              prefix: '',
              status: 'Open Targets',
              description: `Score ${Number(h.score) || 0}`,
              geneSymbols: resolved.geneSymbols.slice(0, 5),
              phenotypes: [],
              references: [],
              url: h.diseaseId
                ? `https://platform.opentargets.org/disease/${h.diseaseId}`
                : 'https://platform.opentargets.org/',
            })
          }
        } catch {
          /* ignore */
        }
      }

      return allEntries.slice(0, 15)
    },
    { source: 'omim' },
  )
}
