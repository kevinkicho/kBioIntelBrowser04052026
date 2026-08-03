import { NextRequest } from 'next/server'
import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'pharmacologyTargets', (name) => getPharmacologyTargetsByName(name), {
    source: 'iuphar',
  })
}
