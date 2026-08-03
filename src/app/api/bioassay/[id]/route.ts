import { NextRequest } from 'next/server'
import { getBioAssaysByName } from '@/lib/api/bioassay'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'bioAssays', (name) => getBioAssaysByName(name), {
    source: 'bioassay',
  })
}
