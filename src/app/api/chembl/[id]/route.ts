import { NextRequest } from 'next/server'
import { getChemblActivitiesByName } from '@/lib/api/chembl'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'activities', (name) => getChemblActivitiesByName(name), {
    source: 'chembl',
  })
}
