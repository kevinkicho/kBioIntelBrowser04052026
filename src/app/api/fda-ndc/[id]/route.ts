import { NextRequest } from 'next/server'
import { getNdcProductsByName } from '@/lib/api/fda-ndc'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'ndcProducts', (name) => getNdcProductsByName(name), {
    source: 'fda-ndc',
  })
}
