import { NextRequest } from 'next/server'
import { getDisGeNetData } from '@/lib/api/disgenet'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'associations',
    async (name) => {
      const data = await getDisGeNetData(name)
      return data.associations ?? []
    },
    { source: 'disgenet' },
  )
}
