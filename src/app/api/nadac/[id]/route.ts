import { NextRequest } from 'next/server'
import { getDrugPricesByName } from '@/lib/api/nadac'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'drugPrices', (name) => getDrugPricesByName(name), {
    source: 'nadac',
  })
}
