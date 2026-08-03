import { NextRequest } from 'next/server'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'drugRecalls', (name) => getDrugRecallsByName(name), {
    source: 'recalls',
  })
}
