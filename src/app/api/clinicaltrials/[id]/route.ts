import { NextRequest } from 'next/server'
import { getClinicalTrialsByName } from '@/lib/api/clinicaltrials'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(request, params, 'trials', (name) => getClinicalTrialsByName(name), {
    source: 'clinicaltrials',
  })
}
