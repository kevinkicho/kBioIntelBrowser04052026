import { NextRequest } from 'next/server'
import { getMeshTermsByName } from '@/lib/api/mesh'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'meshTerms', (name) => getMeshTermsByName(name), {
    source: 'mesh',
  })
}
