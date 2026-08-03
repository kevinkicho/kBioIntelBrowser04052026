import { NextRequest } from 'next/server'
import { getDiseaseAssociationsByName } from '@/lib/api/opentargets'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'diseases', (name) => getDiseaseAssociationsByName(name), {
    source: 'opentargets',
  })
}
