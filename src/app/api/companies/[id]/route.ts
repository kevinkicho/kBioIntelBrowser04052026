import { NextRequest } from 'next/server'
import { getDrugsByIngredient } from '@/lib/api/openfda'
import { moleculeLeafGet } from '@/lib/api/leafRouteAgent'

/** Leaf route delegated to free-API agent policy (timeout/empty/partial). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return moleculeLeafGet(
    request,
    params,
    'companies',
    async (name) => {
      // name is primary title; openFDA by ingredient covers brands
      const results = await getDrugsByIngredient(name)
      const seen = new Set<string>()
      return results.filter((p) => {
        if (seen.has(p.brandName)) return false
        seen.add(p.brandName)
        return true
      })
    },
    { source: 'companies' },
  )
}
