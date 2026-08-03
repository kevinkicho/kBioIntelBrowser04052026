import { NextRequest } from 'next/server'
import { getSecFilingsByName } from '@/lib/api/secedgar'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'filings', (name) => getSecFilingsByName(name), {
    source: 'secedgar',
  })
}
