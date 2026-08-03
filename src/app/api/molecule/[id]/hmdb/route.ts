import { NextRequest } from 'next/server'
import { getHMDBData } from '@/lib/api/hmdb'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'metabolites',
    async (name) => {
      const data = await getHMDBData(name)
      return data.metabolites ?? []
    },
    { source: 'hmdb' },
  )
}
