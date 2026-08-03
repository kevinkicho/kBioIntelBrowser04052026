import { NextRequest } from 'next/server'
import { getPdbStructuresByName } from '@/lib/api/pdb'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'pdbStructures', (name) => getPdbStructuresByName(name), {
    source: 'pdb',
  })
}
