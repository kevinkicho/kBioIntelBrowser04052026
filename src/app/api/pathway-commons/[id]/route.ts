import { NextRequest } from 'next/server'
import { getPathwayCommonsByName } from '@/lib/api/pathway-commons'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'pathwayCommonsResults', (name) => getPathwayCommonsByName(name), {
    source: 'pathway-commons',
  })
}
