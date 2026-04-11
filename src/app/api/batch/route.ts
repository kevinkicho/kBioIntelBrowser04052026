import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getComputedPropertiesByCid } from '@/lib/api/pubchem-properties'
import type { ComputedProperties } from '@/lib/types'

export interface BatchMoleculeResult {
  cid: number
  name: string
  formula: string
  molecularWeight: number
  classification: string
  structureImageUrl: string
  properties: ComputedProperties | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cids } = body as { cids: unknown }

    if (!Array.isArray(cids)) {
      return NextResponse.json({ error: 'cids must be an array' }, { status: 400 })
    }

    if (cids.length < 2 || cids.length > 10) {
      return NextResponse.json(
        { error: 'Must provide between 2 and 10 CIDs' },
        { status: 400 }
      )
    }

    const validCids = cids.filter((c): c is number => typeof c === 'number' && c > 0)
    if (validCids.length !== cids.length) {
      return NextResponse.json({ error: 'All CIDs must be positive numbers' }, { status: 400 })
    }

    const results = await Promise.all(
      validCids.map(async (cid): Promise<BatchMoleculeResult | null> => {
        try {
          const [molecule, properties] = await Promise.all([
            getMoleculeById(cid),
            getComputedPropertiesByCid(cid),
          ])

          if (!molecule) return null

          return {
            cid: molecule.cid,
            name: molecule.name,
            formula: molecule.formula,
            molecularWeight: molecule.molecularWeight,
            classification: molecule.classification,
            structureImageUrl: molecule.structureImageUrl,
            properties,
          }
        } catch {
          return null
        }
      })
    )

    const molecules = results.filter((r): r is BatchMoleculeResult => r !== null)

    return NextResponse.json({ molecules })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
