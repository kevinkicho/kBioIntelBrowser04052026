import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getIEDBData } from '@/lib/api/iedb'

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

    const data = await getIEDBData(molecule.name)

    return NextResponse.json({
      epitopes: data.epitopes
    })
  } catch (error) {
    console.error('IEDB API error:', error)
    return NextResponse.json({ error: 'Failed to fetch IEDB data' }, { status: 500 })
  }
}