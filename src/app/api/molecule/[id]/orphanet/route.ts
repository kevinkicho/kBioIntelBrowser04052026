import { NextRequest } from 'next/server'
import { getOrphanetData } from '@/lib/api/orphanet'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'diseases',
    async (name) => {
      const data = await getOrphanetData(name)
      return data.diseases ?? []
    },
    { source: 'orphanet' },
  )
}
