import { NextRequest } from 'next/server'
import { getWikiPathwaysByName } from '@/lib/api/wikipathways'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'wikiPathways', (name) => getWikiPathwaysByName(name), {
    source: 'wikipathways',
  })
}
