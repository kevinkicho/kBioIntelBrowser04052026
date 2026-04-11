import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getChebiAnnotationByName } from '@/lib/api/chebi'

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
    return NextResponse.json({ chebiAnnotation: null })
  }

  const chebiAnnotation = await getChebiAnnotationByName(molecule.name)
  return NextResponse.json({ chebiAnnotation })
}
