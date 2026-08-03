import { NextRequest } from 'next/server'
import { getMonarchDiseasesByName } from '@/lib/api/monarch'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'monarchDiseases', (name) => getMonarchDiseasesByName(name), {
    source: 'monarch',
  })
}
