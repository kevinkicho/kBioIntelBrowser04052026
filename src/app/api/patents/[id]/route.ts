import { NextRequest } from 'next/server'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'patents', (name) => getPatentsByMoleculeName(name), {
    source: 'patents',
  })
}
