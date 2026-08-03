import { NextRequest } from 'next/server'
import { getKeggCompoundId, getKeggReactions, getKeggReactionDetail } from '@/lib/api/kegg'
import { getRheaSynthesisRoutes } from '@/lib/api/rhea'
import type { SynthesisRoute } from '@/lib/types'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'routes',
    async (name) => {
      const [keggId, rheaRoutes] = await Promise.all([
        getKeggCompoundId(name),
        getRheaSynthesisRoutes(name),
      ])

      const keggRoutes: SynthesisRoute[] = []
      if (keggId) {
        const reactionIds = await getKeggReactions(keggId)
        const details = await Promise.all(reactionIds.slice(0, 5).map(getKeggReactionDetail))
        for (const detail of details) {
          if (!detail) continue
          keggRoutes.push({
            method: detail.name,
            description: detail.equation,
            keggReactionIds: [detail.id],
            enzymesInvolved: detail.enzymes,
            precursors: [],
            source: 'kegg',
          })
        }
      }

      return [...keggRoutes, ...rheaRoutes]
    },
    { source: 'synthesis' },
  )
}
