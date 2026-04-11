import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getOrangeBookByName } from '@/lib/api/orangebook'

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
    return NextResponse.json({ orangeBookEntries: [] })
  }

  const orangeBookEntries = await getOrangeBookByName(molecule.name)
  return NextResponse.json({ orangeBookEntries })
}
