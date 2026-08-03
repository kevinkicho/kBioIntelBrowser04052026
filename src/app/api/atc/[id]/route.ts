import { NextRequest } from 'next/server'
import { getAtcClassificationsByName } from '@/lib/api/atc'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'classifications', (name) => getAtcClassificationsByName(name), {
    source: 'atc',
  })
}
