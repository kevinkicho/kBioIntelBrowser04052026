import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getBgeeData } from '@/lib/api/bgee'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cid = parseInt(params.id, 10)
    if (isNaN(cid)) {
      return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
    }

    const molecule = await getMoleculeById(cid)
    if (!molecule) {
      return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
    }

    const data = await getBgeeData(molecule.name)

    return NextResponse.json({
      expressions: data.expressions
    })
  } catch (error) {
    console.error('Bgee API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Bgee data' }, { status: 500 })
  }
}