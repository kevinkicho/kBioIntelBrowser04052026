import { NextRequest } from 'next/server'
import { getMyGeneData } from '@/lib/api/mygene'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'genes',
    async (name) => {
      const data = await getMyGeneData(name)
      return data.genes ?? []
    },
    { source: 'mygene' },
  )
}
