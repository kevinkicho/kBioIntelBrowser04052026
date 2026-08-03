import { NextRequest } from 'next/server'
import { getChemblMechanismsByName } from '@/lib/api/chembl-mechanisms'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'chemblMechanisms', (name) => getChemblMechanismsByName(name), {
    source: 'chembl-mechanisms',
  })
}
