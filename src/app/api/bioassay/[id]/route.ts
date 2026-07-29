import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getBioAssaysByName } from '@/lib/api/bioassay'

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
    // Still try ChEMBL-free path is not possible without name; empty
    return NextResponse.json({ bioAssays: [] })
  }

  const bioAssays = await getBioAssaysByName(molecule.name, { cid })
  return NextResponse.json({ bioAssays })
}
