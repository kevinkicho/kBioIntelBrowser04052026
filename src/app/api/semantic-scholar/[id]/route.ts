import { NextRequest } from 'next/server'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'semanticPapers', (name) => getSemanticPapersByName(name), {
    source: 'semantic-scholar',
  })
}
