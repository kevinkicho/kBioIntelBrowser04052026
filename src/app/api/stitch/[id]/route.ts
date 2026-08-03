import { NextRequest } from 'next/server'
import { getChemicalInteractionsByName } from '@/lib/api/stitch'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'chemicalProteinInteractions',
    (name, cid) => getChemicalInteractionsByName(name, undefined, { cid }),
    { source: 'stitch' },
  )
}
