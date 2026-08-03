import { NextRequest } from 'next/server'
import { getCompToxByName } from '@/lib/api/comptox'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'compToxData', (name) => getCompToxByName(name), {
    source: 'comptox',
    empty: null,
  })
}
