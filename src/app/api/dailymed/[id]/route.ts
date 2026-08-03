import { NextRequest } from 'next/server'
import { getDrugLabelsByName } from '@/lib/api/dailymed'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'labels', (name) => getDrugLabelsByName(name), {
    source: 'dailymed',
  })
}
