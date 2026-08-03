import { NextRequest } from 'next/server'
import { getUniprotEntriesByName } from '@/lib/api/uniprot'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'proteinAtlasEntries', (name) => getUniprotEntriesByName(name), {
    source: 'protein-atlas',
  })
}
