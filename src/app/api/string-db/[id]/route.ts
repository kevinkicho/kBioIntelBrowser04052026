import { NextRequest } from 'next/server'
import { getProteinInteractionsByName } from '@/lib/api/string-db'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'proteinInteractions', (name) => getProteinInteractionsByName(name), {
    source: 'string-db',
  })
}
