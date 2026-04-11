import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getLiteratureByName } from '@/lib/api/europepmc'
import { getCitationMetrics } from '@/lib/api/opencitations'

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
    return NextResponse.json({ citationMetrics: [] })
  }

  const literature = await getLiteratureByName(molecule.name)
  const dois = literature.map(l => l.doi).filter(Boolean)
  const citationMetrics = await getCitationMetrics(dois)
  return NextResponse.json({ citationMetrics })
}
