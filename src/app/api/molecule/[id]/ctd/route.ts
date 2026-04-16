import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getCTDData } from '@/lib/api/ctd'

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

    const data = await getCTDData(molecule.name, false)

    return NextResponse.json({
      interactions: data.interactions,
      diseaseAssociations: data.diseaseAssociations
    })
  } catch (error) {
    console.error('CTD API error:', error)
    return NextResponse.json({ error: 'Failed to fetch CTD data' }, { status: 500 })
  }
}