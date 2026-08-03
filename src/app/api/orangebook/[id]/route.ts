import { NextRequest } from 'next/server'
import { getOrangeBookByName } from '@/lib/api/orangebook'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'orangeBookEntries', (name) => getOrangeBookByName(name), {
    source: 'orangebook',
  })
}
