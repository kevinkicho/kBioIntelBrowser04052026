import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getHMDBData } from '@/lib/api/hmdb'

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

    const data = await getHMDBData(molecule.name)

    return NextResponse.json({
      metabolites: data.metabolites
    })
  } catch (error) {
    console.error('HMDB API error:', error)
    return NextResponse.json({ error: 'Failed to fetch HMDB data' }, { status: 500 })
  }
}