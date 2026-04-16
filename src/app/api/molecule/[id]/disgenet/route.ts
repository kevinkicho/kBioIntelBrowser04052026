import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getDisGeNetData } from '@/lib/api/disgenet'

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

    const data = await getDisGeNetData(molecule.name)

    return NextResponse.json({
      associations: data.associations
    })
  } catch (error) {
    console.error('DisGeNET API error:', error)
    return NextResponse.json({ error: 'Failed to fetch DisGeNET data' }, { status: 500 })
  }
}