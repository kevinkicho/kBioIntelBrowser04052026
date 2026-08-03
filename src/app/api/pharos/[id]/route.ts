import { NextRequest } from 'next/server'
import { getPharosTargetsByName } from '@/lib/api/pharos'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'pharosTargets', (name) => getPharosTargetsByName(name), {
    source: 'pharos',
  })
}
