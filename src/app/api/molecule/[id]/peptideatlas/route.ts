import { NextRequest } from 'next/server'
import { getPeptideAtlasData, getPeptidesByProtein } from '@/lib/api/peptideatlas'
import { resolveDrugTargets } from '@/lib/api/drugTargetResolve'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'peptides',
    async (name) => {
      const resolved = await resolveDrugTargets(name, 5)
      const peptides: unknown[] = []
      const seen = new Set<string>()

      for (const acc of resolved.uniprotAccessions.slice(0, 3)) {
        const rows = await getPeptidesByProtein(acc)
        for (const p of rows) {
          const key = p.peptideId || p.sequence
          if (seen.has(key)) continue
          seen.add(key)
          peptides.push(p)
        }
        if (peptides.length >= 10) break
      }

      if (peptides.length === 0) {
        for (const gene of resolved.geneSymbols.slice(0, 3)) {
          const data = await getPeptideAtlasData(gene)
          for (const p of data.peptides ?? []) {
            const key = p.peptideId || p.sequence
            if (seen.has(key)) continue
            seen.add(key)
            peptides.push(p)
          }
          if (peptides.length >= 10) break
        }
      }

      if (peptides.length === 0) {
        const data = await getPeptideAtlasData(name)
        peptides.push(...(data.peptides ?? []))
      }

      return peptides.slice(0, 20)
    },
    { source: 'peptideatlas' },
  )
}
