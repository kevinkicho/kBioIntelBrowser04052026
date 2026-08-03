import { NextRequest } from 'next/server'
import { getClinVarVariantsByName } from '@/lib/api/clinvar'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'clinVarVariants', (name) => getClinVarVariantsByName(name), {
    source: 'clinvar',
  })
}
