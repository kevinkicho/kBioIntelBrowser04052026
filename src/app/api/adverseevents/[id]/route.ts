import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'

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
    return NextResponse.json({ adverseEvents: [] })
  }

  const adverseEvents = await getAdverseEventsByName(molecule.name)
  return NextResponse.json({ adverseEvents })
}
