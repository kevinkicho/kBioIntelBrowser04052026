import { NextRequest } from 'next/server'
import { getMyChemData } from '@/lib/api/mychem'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'chemicals',
    async (name) => {
      const data = await getMyChemData(name)
      return data.chemicals ?? []
    },
    { source: 'mychem' },
  )
}
