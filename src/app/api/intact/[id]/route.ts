import { NextRequest } from 'next/server'
import { getMolecularInteractionsByName } from '@/lib/api/intact'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'molecularInteractions',
    (name) => getMolecularInteractionsByName(name),
    { source: 'intact' },
  )
}
