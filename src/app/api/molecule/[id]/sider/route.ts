import { NextRequest } from 'next/server'
import { getSIDERData } from '@/lib/api/sider'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** SIDER side-effects — free-API agent policy. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'sideEffects',
    async (name) => {
      const data = await getSIDERData(name)
      return data.sideEffects ?? []
    },
    { source: 'sider' },
  )
}
