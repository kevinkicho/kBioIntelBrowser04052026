import { NextRequest } from 'next/server'
import { getGwasAssociationsByName } from '@/lib/api/gwas-catalog'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'gwasAssociations',
    (name) => getGwasAssociationsByName(name),
    { source: 'gwas-catalog' },
  )
}
