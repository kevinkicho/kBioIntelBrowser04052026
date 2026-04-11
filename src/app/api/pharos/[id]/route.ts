import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getPharosTargetsByName } from '@/lib/api/pharos'

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
    return NextResponse.json({ pharosTargets: [] })
  }
  const pharosTargets = await getPharosTargetsByName(molecule.name)
  return NextResponse.json({ pharosTargets })
}
