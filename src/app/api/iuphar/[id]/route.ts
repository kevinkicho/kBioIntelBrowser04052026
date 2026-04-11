import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getPharmacologyTargetsByName } from '@/lib/api/iuphar'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  const molecule = await getMoleculeById(cid)
  if (!molecule) {
    return NextResponse.json({ pharmacologyTargets: [] })
  }

  const pharmacologyTargets = await getPharmacologyTargetsByName(molecule.name)
  return NextResponse.json({ pharmacologyTargets })
}
