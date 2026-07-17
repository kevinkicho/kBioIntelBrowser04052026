import { NextRequest, NextResponse } from 'next/server'
import { getMoleculeById, PubChemUpstreamError } from '@/lib/api/pubchem'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cid = parseInt(params.id, 10)
  if (isNaN(cid)) {
    return NextResponse.json({ error: 'Invalid molecule ID' }, { status: 400 })
  }

  try {
    const molecule = await getMoleculeById(cid)
    if (!molecule) {
      return NextResponse.json({ error: 'Molecule not found' }, { status: 404 })
    }
    return NextResponse.json({ molecule })
  } catch (error) {
    if (error instanceof PubChemUpstreamError) {
      return NextResponse.json(
        {
          error: 'Upstream molecule lookup unavailable',
          retryable: true,
          message: error.message,
        },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: 'Failed to fetch molecule' }, { status: 500 })
  }
}
