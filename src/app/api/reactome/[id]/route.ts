import { NextRequest } from 'next/server'
import { getReactomePathwaysByName } from '@/lib/api/reactome'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'reactomePathways', (name) => getReactomePathwaysByName(name), {
    source: 'reactome',
  })
}
