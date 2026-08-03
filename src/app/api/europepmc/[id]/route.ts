import { NextRequest } from 'next/server'
import { getLiteratureByName } from '@/lib/api/europepmc'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'results', (name) => getLiteratureByName(name), {
    source: 'europepmc',
  })
}
