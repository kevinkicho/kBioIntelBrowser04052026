import { NextResponse } from 'next/server'
import { getMoleculeById } from '@/lib/api/pubchem'
import { getSIDERData } from '@/lib/api/sider'

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

    const data = await getSIDERData(molecule.name)

    return NextResponse.json({
      sideEffects: data.sideEffects
    })
  } catch (error) {
    console.error('SIDER API error:', error)
    return NextResponse.json({ error: 'Failed to fetch SIDER data' }, { status: 500 })
  }
}