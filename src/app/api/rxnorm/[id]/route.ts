import { NextRequest } from 'next/server'
import { getDrugInteractionsByName } from '@/lib/api/rxnorm'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'interactions', (name) => getDrugInteractionsByName(name), {
    source: 'rxnorm',
  })
}
