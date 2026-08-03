import { NextRequest } from 'next/server'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'adverseEvents', (name) => getAdverseEventsByName(name), {
    source: 'adverseevents',
  })
}
