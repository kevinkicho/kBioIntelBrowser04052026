import { NextRequest } from 'next/server'
import { getChebiAnnotationByName } from '@/lib/api/chebi'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'chebiAnnotation',
    (name) => getChebiAnnotationByName(name),
    { source: 'chebi', empty: null },
  )
}
