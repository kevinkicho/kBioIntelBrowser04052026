import { NextRequest } from 'next/server'
import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'bindingAffinities', (name) => getBindingAffinitiesByName(name), {
    source: 'bindingdb',
  })
}
