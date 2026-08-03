import { NextRequest } from 'next/server'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'grants', (name) => getNihGrantsByName(name), {
    source: 'nihreporter',
  })
}
