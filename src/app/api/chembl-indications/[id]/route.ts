import { NextRequest } from 'next/server'
import { getChemblIndicationsByName } from '@/lib/api/chembl-indications'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'chemblIndications', (name) => getChemblIndicationsByName(name), {
    source: 'chembl-indications',
  })
}
