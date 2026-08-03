import { NextRequest } from 'next/server'
import { getGeneInfoByName } from '@/lib/api/ncbi-gene'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'geneInfo', (name) => getGeneInfoByName(name), {
    source: 'ncbi-gene',
  })
}
